import { isEmpty, forEach, isUndefined, cloneDeep, get, trim, find, filter, map, reduce, indexOf, times } from 'lodash'

export interface Cascade {
  [key: string]: any
}

interface Strs {
  [key: string]: string
}

interface Values {
  [key: string]: any
}

interface FlattenResult {
  strs: Strs
  cascade: Cascade
  path: string
}
type DeepForEachCallback = (cascade: Cascade, currentLevel: number, currentIndex: number) => void
type DeepMapCallback = (
  cascade: Cascade,
  currentLevel: number,
  currentIndex: number,
  path: string,
  parent?: Cascade
) => void

export const generateRandomString = (level = 0, index = 0): string => {
  const str = Math.random()
    .toString(36)
    .substr(2, 7)

  return str + '-' + level + '-' + index
}

const generateCascade = (level: number, index: number): Cascade => ({
  name: `${level}.${index}`,
  value: generateRandomString(level, index),
})

class CascadeHelper {
  public subKey: string
  public valueKey: string
  public constructor(subKey = 'children', valueKey = 'value') {
    this.subKey = subKey
    this.valueKey = valueKey
  }

  public deepFlatten(
    cascades: Cascade[],
    options?: { labels?: string[]; itemSeparator?: string; endLevel?: number }
  ): FlattenResult[] {
    const labels = get(options, 'labels') || []
    const itemSeparator = get(options, 'itemSeparator') || '-'
    const endLevel = get(options, 'endLevel')

    const results: FlattenResult[] = []
    const { subKey } = this

    const iteratorCascades = (cascades: Cascade[], strs: Strs = {}, path?: string, level?: number): void => {
      forEach(cascades, (cascade, index) => {
        const cStrs: Strs = {}
        forEach(labels, (label) => {
          cStrs[label] = !isUndefined(strs[label]) ? strs[label] + itemSeparator + cascade[label] : cascade[label]
        })

        let cLevel = !isUndefined(level) ? level : 0
        const cPath = !isUndefined(path) ? `${path}.${subKey}[${index}]` : `[${index}]`

        if (!isEmpty(cascade[subKey]) && (isUndefined(endLevel) || (!isUndefined(endLevel) && cLevel < endLevel))) {
          cLevel++
          return iteratorCascades(cascade[subKey], cStrs, cPath, cLevel)
        }

        results.push({ strs: cStrs, cascade: cloneDeep(cascade), path: cPath })
      })
    }

    iteratorCascades(cascades)
    return results
  }

  /*
   * Fill cascade
   */
  public deepFill(
    cascades: Cascade[] = [],
    options?: {
      count?: number
      generateFunc?: (level: number, index: number) => Cascade
      startLevel?: number
      endLevel?: number
    }
  ): Cascade[] {
    const count = get(options, 'count') || 2
    const generateFunc = get(options, 'generateFunc') || generateCascade
    const startLevel = get(options, 'startLevel') || 0
    const endLevel = get(options, 'endLevel') || 1

    const { subKey } = this
    const newCascades = { [subKey]: cloneDeep(cascades) }

    if (startLevel > endLevel) {
      return newCascades[subKey]
    }

    const setInit = (level: number, cascade: Cascade): void => {
      if (isUndefined(cascade[subKey])) {
        cascade[subKey] = []
      }

      if (isEmpty(cascade[subKey])) {
        times(count, (xIndex) => {
          if (isUndefined(cascade[subKey][xIndex])) {
            cascade[subKey][xIndex] = generateFunc(level, xIndex)
          }
        })
      }

      forEach(cascade[subKey], (item) => {
        if (level < endLevel) {
          setInit(level + 1, item)
        }
      })
    }

    setInit(startLevel, newCascades)
    return newCascades[subKey]
  }

  /*
   * For each cascade
   */
  public deepForEach(
    cascades: Cascade[],
    cb: DeepForEachCallback,
    options?: { startLevel?: number; endLevel?: number }
  ): void {
    const startLevel = get(options, 'startLevel') || 0
    const endLevel = get(options, 'endLevel')
    const { subKey } = this

    forEach(cascades, (cascade, index) => {
      cb(cascade, startLevel, index)
      if (!isEmpty(cascade[subKey])) {
        if (endLevel && startLevel >= endLevel) {
          return
        }

        this.deepForEach(cascade[subKey], cb, { startLevel: startLevel + 1, endLevel })
      }
    })
  }

  /*
   * Map cascades
   */
  public deepMap(cascades: Cascade[], cb: DeepMapCallback, options?: { startLevel?: number }): any[] {
    const { subKey } = this
    const newCascades = cloneDeep(cascades)

    const iteratorCascades = (
      cascades: Cascade[],
      cb: DeepMapCallback,
      options?: { startLevel?: number; parent?: Cascade; path?: string }
    ): any[] => {
      const startLevel = get(options, 'startLevel') || 0
      const parent = get(options, 'parent')
      const path = get(options, 'path')

      return map(cascades, (cascade, index) => {
        const cPath = !isUndefined(path) ? `${path}.${subKey}[${index}]` : `[${index}]`

        if (!isEmpty(cascade[subKey])) {
          cascade[subKey] = iteratorCascades(cascade[subKey], cb, {
            startLevel: startLevel + 1,
            parent: cascade,
            path: cPath,
          })
        }

        return cb(cascade, startLevel, index, cPath, parent)
      })
    }

    return iteratorCascades(newCascades, cb, { startLevel: get(options, 'startLevel') })
  }

  /*
   * Get init values
   * Get the first value of cascades by default
   */
  public initValues(cascades: Cascade[], levelCount: number, index = 0): Values {
    const { subKey, valueKey } = this

    return reduce<any, { [key: string]: string }>(
      times(levelCount),
      (acc, _curr, level) => {
        acc[`level${level}`] = get(
          cascades,
          `[${index}]` + times(level, () => `${subKey}[${index}]`).join('.') + valueKey
        )
        return acc
      },
      {}
    )
  }

  /*
   * Get the specified level cascades by current values
   */
  public getLevelCascades(
    cascades: Cascade[],
    values: Values,
    level: number
  ): {
    cascades: Cascade[]
    path: string
    parent: Cascade | null
  } {
    let path = ''
    const { subKey, valueKey } = this

    if (level <= 0) {
      return { cascades: cascades || [], path, parent: null }
    }

    const prevLevel = level - 1
    if (values && isEmpty(values[`level${prevLevel}`])) {
      return { cascades: [], path, parent: null }
    }

    const iteratorSubCascades = (startLevel: number, endLevel: number, subCascades: Cascade[]): any => {
      const targetValue = values && values[`level${startLevel}`]
      const current = find(subCascades, (cascade) => get(cascade, valueKey) === targetValue)
      const currentIndex = indexOf(subCascades, current)
      path += `[${currentIndex}].${subKey}`

      if (!current) {
        return { subCascades: [], parent: null }
      }

      if (startLevel >= endLevel) {
        return {
          subCascades: current[subKey] || [],
          parent: { cascade: current, index: currentIndex, level: startLevel },
        }
      }

      return iteratorSubCascades(startLevel + 1, endLevel, current[subKey] || [])
    }

    const { subCascades, parent } = iteratorSubCascades(0, prevLevel, cascades)
    return { cascades: subCascades, path, parent }
  }

  /*
   * To structure cascades by text
   */
  public parse(
    str: string,
    cb: (key: string, valueKey: string, level: number, index: number) => Cascade,
    options?: { itemSeparator?: string; levelSeparator?: string }
  ): Cascade[] {
    const itemSeparator = get(options, 'itemSeparator') || '-'
    const levelSeparator = get(options, 'levelSeparator') || '\n'

    const { subKey, valueKey } = this
    const parseLabels = (tArr: string[][], level = 0): Cascade[] => {
      const result = reduce<any, { [key: string]: string[][] }>(
        tArr,
        (acc, curr) => {
          if (!acc[curr[0]]) {
            acc[curr[0]] = []
          }
          const newCurr = filter(curr, (item) => item !== curr[0])
          if (newCurr.length > 0) {
            acc[curr[0]] = [...acc[curr[0]], newCurr]
          }

          return acc
        },
        {}
      )
      const cLevel = level
      let index = 0
      level++
      return map(result, (item, key) => {
        let cascade

        if (isEmpty(item)) {
          cascade = { ...cb(key, valueKey, cLevel, index) }
        } else {
          cascade = {
            [subKey]: parseLabels(item, level),
            ...cb(key, valueKey, cLevel, index),
          }
        }

        index++
        return cascade
      })
    }

    const trimedStr = trim(str)
    if (isEmpty(trimedStr)) {
      return []
    }
    const arr = trimedStr.split(levelSeparator)
    const tArr = map(arr, (item) => item.split(itemSeparator))

    return parseLabels(tArr)
  }

  /*
   * Serialize string to cascades
   */

  public stringify(
    cascades: Cascade[],
    label: string,
    options?: { itemSeparator?: string; levelSeparator?: string; endLevel?: number }
  ): string {
    const itemSeparator = get(options, 'itemSeparator') || '-'
    const levelSeparator = get(options, 'levelSeparator') || '\n'
    const endLevel = get(options, 'endLevel')

    const results = this.deepFlatten(cascades, { labels: [label], itemSeparator, endLevel })
    return map(results, (item) => item.strs[label]).join(levelSeparator)
  }
}

export default CascadeHelper

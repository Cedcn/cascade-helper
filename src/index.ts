import { isEmpty, forEach, isUndefined, cloneDeep, get, reduce, times } from 'lodash'

export interface Cascade {
  [key: string]: any
}

interface Strs {
  [key: string]: string
}

interface FlattenResult {
  strs: Strs
  cascade: Cascade
  path: string
}

export const generateRandomString = (level: number = 0, index: number = 0): string => {
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
  public constructor(subKey: string = 'children', valueKey: string = 'value') {
    this.subKey = subKey
    this.valueKey = valueKey
  }

  public flatten(cascades: Cascade[], labels: string[] = [], endLevel?: number): FlattenResult[] {
    const results: FlattenResult[] = []
    const { subKey } = this

    const traverse = (cascades: Cascade[], strs: Strs = {}, path?: string, level?: number): void => {
      forEach(cascades, (cascade, index) => {
        let cStrs: Strs = {}
        forEach(labels, (label) => {
          cStrs[label] = !isUndefined(strs[label]) ? strs[label] + '-' + cascade[label] : cascade[label]
        })

        let cLevel = !isUndefined(level) ? level : 0
        const cPath = !isUndefined(path) ? `${path}.${subKey}[${index}]` : `[${index}]`

        if (!isEmpty(cascade[subKey]) && (isUndefined(endLevel) || (!isUndefined(endLevel) && cLevel < endLevel))) {
          cLevel++
          return traverse(cascade[subKey], cStrs, cPath, cLevel)
        }

        results.push({ strs: cStrs, cascade: cloneDeep(cascade), path: cPath })
      })
    }

    traverse(cascades)
    return results
  }

  /*
   * Fill cascade
   */
  public cascadeFill(
    cascades: Cascade[] = [],
    count: number = 2,
    startLevel: number = 0,
    endLevel: number = 1,
    geterateFunc: (level: number, index: number) => Cascade = generateCascade
  ): Cascade[] {
    const { subKey } = this
    let newCascades = { [subKey]: cloneDeep(cascades) }

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
            cascade[subKey][xIndex] = geterateFunc(level, xIndex)
          }
        })
      }

      forEach(cascade[subKey], (choice) => {
        if (level < endLevel) {
          setInit(level + 1, choice)
        }
      })
    }

    setInit(startLevel, newCascades)
    return newCascades[subKey]
  }

  /*
   * For each cascade
   */
  public cascadeForEach(
    cascades: Cascade[],
    cb: (cascade: Cascade, currentlevel?: number, currentIndex?: number) => void,
    startLevel: number = 0,
    endLevel?: number
  ): void {
    const { subKey } = this

    forEach(cascades, (cascade, index) => {
      cb(cascade, startLevel, index)
      if (!isEmpty(cascade[subKey])) {
        if (endLevel && startLevel >= endLevel) {
          return
        }

        this.cascadeForEach(cascade[subKey], cb, startLevel + 1, endLevel)
      }
    })
  }

  /*
   * Get init values
   * Get the first value of cascades by default
   */
  public initValues = (cascades: Cascade[], levels: number, index: number = 0) => {
    const { subKey, valueKey } = this

    return reduce<any, { [key: string]: string }>(
      times(levels),
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
}

export default CascadeHelper

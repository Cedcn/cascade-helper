import CascadeHelper, { generateRandomString, Cascade } from '../index'

const random = Math.random()
Math.random = jest.fn().mockReturnValue(random)
const mockValue = generateRandomString

describe('CascadeHelper', () => {
  const cascadeHelper = new CascadeHelper()
  test('instance method - cascadeFill', () => {
    const cascades = cascadeHelper.cascadeFill()
    const expectCascades = [
      {
        name: '0.0',
        value: mockValue(0, 0),
        children: [
          {
            name: '1.0',
            value: mockValue(1, 0),
          },
          {
            name: '1.1',
            value: mockValue(1, 1),
          },
        ],
      },
      {
        name: '0.1',
        value: mockValue(0, 1),
        children: [
          {
            name: '1.0',
            value: mockValue(1, 0),
          },
          {
            name: '1.1',
            value: mockValue(1, 1),
          },
        ],
      },
    ]
    expect(cascades).toEqual(expectCascades)
  })

  test('instance method - flatten', () => {
    const cascades = cascadeHelper.cascadeFill()
    const results = cascadeHelper.flatten(cascades, ['name'])
    const expectResults = [
      {
        strs: { name: '0.0-1.0' },
        cascade: { name: '1.0', value: mockValue(1, 0) },
        path: '[0].children[0]',
      },
      {
        strs: { name: '0.0-1.1' },
        cascade: { name: '1.1', value: mockValue(1, 1) },
        path: '[0].children[1]',
      },
      {
        strs: { name: '0.1-1.0' },
        cascade: { name: '1.0', value: mockValue(1, 0) },
        path: '[1].children[0]',
      },
      {
        strs: { name: '0.1-1.1' },
        cascade: { name: '1.1', value: mockValue(1, 1) },
        path: '[1].children[1]',
      },
    ]

    expect(expectResults).toEqual(results)
  })

  test('instance method - cascadeForEach', () => {
    const cascades = cascadeHelper.cascadeFill()
    cascadeHelper.cascadeForEach(cascades, (cascade: Cascade, currentlevel?: number, currentIndex?: number) => {
      cascade.name = `modify-${currentlevel}-${currentIndex}`
    })

    const expectCascades = [
      {
        name: 'modify-0-0',
        value: mockValue(0, 0),
        children: [
          {
            name: 'modify-1-0',
            value: mockValue(1, 0),
          },
          {
            name: 'modify-1-1',
            value: mockValue(1, 1),
          },
        ],
      },
      {
        name: 'modify-0-1',
        value: mockValue(0, 1),
        children: [
          {
            name: 'modify-1-0',
            value: mockValue(1, 0),
          },
          {
            name: 'modify-1-1',
            value: mockValue(1, 1),
          },
        ],
      },
    ]

    expect(expectCascades).toEqual(cascades)
  })

  test('instance method - initValues', () => {
    const cascades = cascadeHelper.cascadeFill()
    const values = cascadeHelper.initValues(cascades, 2)
    const expectValues = { level0: mockValue(0, 0), level1: mockValue(1, 0) }
    expect(expectValues).toEqual(values)

    const values2 = cascadeHelper.initValues(cascades, 2, 1)
    const expectValues2 = { level0: mockValue(0, 1), level1: mockValue(1, 1) }
    expect(expectValues2).toEqual(values2)
  })
})

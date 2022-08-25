import { watch } from '../watch';
import { reactive } from '../reactive';

describe('watch', function() {
  it('监听响应式对象foo属性 并触发回调', function() {
    const obj = reactive({ foo: 1 })
    const cb = jest.fn(() => obj.foo)
    watch(obj, cb)

    expect(cb).toHaveBeenCalledTimes(0)
    obj.foo++
    expect(cb).toHaveBeenCalledTimes(1)
  });

  it('对象任意属性都可以触发回调', function() {
    const obj = reactive({ foo: 1, bar: 1 })
    const cb = jest.fn(() => 1)
    watch(obj, cb)

    expect(cb).toHaveBeenCalledTimes(0)
    obj.foo++
    expect(cb).toHaveBeenCalledTimes(1)
    obj.bar++
    expect(cb).toHaveBeenCalledTimes(2)
  });

  it('可以监听 getter 函数', function() {
    const obj = reactive({ foo: 1, bar: 1 })
    const cb = jest.fn(() => 1)
    const getter = jest.fn(() => obj.foo)

    watch(getter, cb)
    obj.foo++
    expect(cb).toHaveBeenCalledTimes(1)
  });

  it('回调函数可以获取新值和旧值', function() {
    const obj = reactive({ foo: 1, bar: 1 })
    let _newVal, _oldVal
    const cb = jest.fn((newVal, oldVal) => {
      _newVal = newVal
      _oldVal = oldVal
    })
    const getter = jest.fn(() => obj.foo)

    watch(getter, cb)
    obj.foo++
    expect(_oldVal).toBe(1)
    expect(_newVal).toBe(2)
    obj.foo++
    expect(_oldVal).toBe(2)
    expect(_newVal).toBe(3)
  });

  it('immediate 立即执行参数', function() {
    const obj = reactive({ foo: 1, bar: 1 })
    const cb = jest.fn(() => 1)
    watch(obj, cb, { immediate: true })
    expect(cb).toHaveBeenCalledTimes(1)
    obj.bar++
  });

  it('onInvalidate 回调处理竞态问题', async function() {
    jest.useFakeTimers()
    let finalData
    let arr = [1, 2, 3]

    async function sleep(ms) {
      const result = arr.pop()
      return new Promise(r => setTimeout(() => r(result), ms))
    }

    const obj = reactive({ foo: 1, bar: 1 })

    watch(obj, async (newVal, oldVal, onInvalidate) => {
      let expired = false

      onInvalidate(() => {
        expired = true // 可以将这段注释，则 finalData 为3
      })

      const res = await sleep(arr.length * 1000)
      // res 的返回顺序应该为 1 2 3
      // 因为 2、3 都已经过期，所以最终的值为 1

      if (!expired) {
        finalData = res
        expect(finalData).toBe(1)
      }
    })

    obj.foo++
    obj.foo++
    obj.foo++
    jest.runAllTimers()
  });

  // todo
  it('嵌套属性触发回调', function() {
  });
});

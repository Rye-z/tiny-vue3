import { reactive } from '../reactive.js';
import { effect } from '../effect';

describe('effect', function() {
  it('should observe basic properties', function() {
    let dummy
    const counter = reactive({ num: 0 })
    effect(() => (dummy = counter.num + 1))

    expect(dummy).toBe(1)
    counter.num = 7
    expect(dummy).toBe(8)
  });

  it('分支切换 / 清除遗留富副作用函数', function() {
    let text
    const obj = reactive({ ok: true, text: 'hello' })

    const fn = jest.fn(() => {
      text = obj.ok ? obj.text : 'sorry'
    })
    effect(fn)
    expect(fn).toHaveBeenCalledTimes(1)

    expect(text).toBe('hello')
    obj.ok = false
    expect(fn).toHaveBeenCalledTimes(2)
    expect(text).toBe('sorry')
    /**
     * 1.分支切换：因为 obj.ok 为 false，所以 obj.text 永远不会执行
     *   所以当 obj.text 改变时，副作用函数不应该被触发
     */
    obj.text = 'change'
    expect(fn).toHaveBeenCalledTimes(2)
  });

  it('嵌套 effect', function() {
    let obj = reactive({ foo: 'foo', bar: 'bar' })
    const fn1 = jest.fn(() => () => console.log('fn1'))
    const fn2 = jest.fn(() => () => console.log('fn2'))

    effect(() => {
      fn1()
      effect(() => {
        fn2()
        obj.foo
      })
      obj.bar
    })
    expect(fn1).toHaveBeenCalledTimes(1)
    expect(fn2).toHaveBeenCalledTimes(1)
    obj.foo = 1
    // obj.foo 在内层 effect，obj.foo 改变时不应该触发外层 effect
    expect(fn1).toHaveBeenCalledTimes(1)
    expect(fn2).toHaveBeenCalledTimes(2)
    // obj.bar 在外层，因为内层还嵌套了一个 effect()，所以会同时触发内层的 effect
    // => fn1 和 fn2 都会被调用
    obj.bar = 1
    expect(fn1).toHaveBeenCalledTimes(2)
    expect(fn2).toHaveBeenCalledTimes(3)

  });
});

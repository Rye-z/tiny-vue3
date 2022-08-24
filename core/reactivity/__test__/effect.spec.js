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
    const obj = reactive({ ok: true, text: 'hello'})

    const fn = jest.fn(() => {
      text = obj.ok ? obj.text : "sorry"
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
});

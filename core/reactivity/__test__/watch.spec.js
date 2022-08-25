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

  // todo
  it('嵌套属性触发回调', function() {
  });
});

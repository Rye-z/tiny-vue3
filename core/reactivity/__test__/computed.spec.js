import { reactive } from '../reactive';
import { computed } from '../computed';
import { effect } from '../effect';

describe('computed', function() {
  it('可以通过 value 访问', function() {
    const obj = reactive({ foo: 1})
    const getter = jest.fn(() => obj.foo)
    const bar = computed(getter)
    expect(bar.value).toBe(1)
  });

  it('延迟访问', function() {
    const obj = reactive({ foo: 1})
    const getter = jest.fn(() => obj.foo)
    const bar = computed(getter)
    // 因为延迟访问，所以此时 getter 尚未执行
    expect(getter).toHaveBeenCalledTimes(0)
    // 延迟访问，此时运行 getter，获取返回值
    expect(bar.value).toBe(1)
    expect(getter).toHaveBeenCalledTimes(1)
    // [[set]] 触发副作用函数执行
    obj.foo++ // 此时运行 scheduler，`dirty=true`，但 getter 还没执行
    expect(getter).toHaveBeenCalledTimes(1)
    // 访问 value 属性，getter 执行
    expect(bar.value).toBe(2)
  });

  it('计算缓存', function() {
    // 只有响应式数据改变后，访问 computed 会重新计算
    // [[get]] 操作不会触发副作用函数
    const obj = reactive({ foo: 1})
    const getter = jest.fn(() => obj.foo)
    const bar = computed(getter)
    // 因为延迟访问，所以此时 getter 尚未执行
    expect(getter).toHaveBeenCalledTimes(0)
    bar.value
    expect(getter).toHaveBeenCalledTimes(1)
    bar.value // 仅仅访问值，不触发重新计算
    expect(getter).toHaveBeenCalledTimes(1)
    obj.foo++ // 修改值
    bar.value // 访问 value 触发重新计算
    expect(getter).toHaveBeenCalledTimes(2)
  });

  it('computed 作为 effect 的依赖', function() {
    const obj = reactive({ foo: 1})
    const getter = jest.fn(() => obj.foo)
    const bar = computed(getter)

    const effectFn = jest.fn(() => bar.value)
    effect(effectFn)
    expect(effectFn).toHaveBeenCalledTimes(1)
    expect(getter).toHaveBeenCalledTimes(1)
    // obj.foo 改变时，应该同时触发 getter 和 effectFn
    obj.foo++
    expect(getter).toHaveBeenCalledTimes(2)
    expect(effectFn).toHaveBeenCalledTimes(2)
  });
});

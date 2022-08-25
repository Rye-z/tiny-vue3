import { reactive } from '../reactive';
import { computed } from '../computed';

describe('computed', function() {
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
    obj.foo++
    expect(getter).toHaveBeenCalledTimes(2)
    expect(bar.value).toBe(2)
  });
});

import { watch } from '../watch';
import { reactive } from '../reactive';

describe('watch', function() {
  it('监听响应式对象并触发回调', function() {
    const obj = reactive({foo: 1})
    const cb = jest.fn(() => obj.foo)
    watch(obj, cb)

    expect(cb).toHaveBeenCalledTimes(0)
    obj.foo++
    expect(cb).toHaveBeenCalledTimes(1)
  });
});

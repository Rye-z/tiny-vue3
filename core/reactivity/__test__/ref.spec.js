import { ref } from '../ref';
import { effect } from '../effect';

describe('ref', function() {
  it('ref.value', function() {
    const r = ref(1)
    expect(r.value).toBe(1)
  });

  it('ref.value 触发 effect', function() {
    const r = ref(1)
    const fn = jest.fn(() => r.value)
    effect(fn)
    expect(fn).toHaveBeenCalledTimes(1)
    r.value++
    expect(fn).toHaveBeenCalledTimes(2)
  });
});

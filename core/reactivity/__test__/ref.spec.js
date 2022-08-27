import {
  isRef,
  ref
} from '../ref';
import { effect } from '../effect';
import { reactive } from '../reactive';

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

  it('isRef', function() {
    const a = ref('a')
    const b = reactive({b: 'b'})
    const c = 'c'
    expect(isRef(a)).toBe(true)
    expect(isRef(b)).toBe(false)
    expect(isRef(c)).toBe(false)
  });
});

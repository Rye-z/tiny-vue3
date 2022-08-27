import {
  isRef,
  proxyRefs,
  ref,
  toRef,
  toRefs
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
    const b = reactive({ b: 'b' })
    const c = 'c'
    expect(isRef(a)).toBe(true)
    expect(isRef(b)).toBe(false)
    expect(isRef(c)).toBe(false)
  });

  it('toRef', function() {
    // toRef 可以解决展开运算符会导致响应性丢失的问题
    const obj = reactive({ a: 'a', b: 'b' })
    const newObj = {
      a: toRef(obj, 'a'),
      b: toRef(obj, 'b')
    }

    const fn = jest.fn(() => newObj.a.value)
    effect(fn)
    expect(fn).toHaveBeenCalledTimes(1)
    newObj.a.value++
    expect(fn).toHaveBeenCalledTimes(2)
  });

  it('toRefs', function() {
    const obj = reactive({ a: 'a', b: 'b' })
    const newObj = toRefs(obj)

    const fn = jest.fn(() => newObj.a.value)
    effect(fn)
    expect(fn).toHaveBeenCalledTimes(1)
    newObj.a.value++
    expect(fn).toHaveBeenCalledTimes(2)
  });

  it('proxyRefs', function() {
    // 在 Vue 模板中，自动脱 ref：不需要使用 .value 来访问
    // 用户也不用考虑哪些是 ref，哪些是 reactive，从而降低用户的心智负担
    // Vue.js 组件中的 setup 函数所返回的数据会传递给 proxyRefs 函数进行处理
    const obj = reactive({ a: 1, b: 2 })
    const newObj = proxyRefs({...toRefs(obj)})

    const fn = jest.fn(() => newObj.a)

    effect(fn)
    expect(fn).toHaveBeenCalledTimes(1)

    expect(newObj.a).toBe(1)
    newObj.a++
    expect(newObj.a).toBe(2)
    expect(fn).toHaveBeenCalledTimes(2)
  });
});

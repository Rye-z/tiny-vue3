import { reactive } from './reactive';

export function isRef(value) {
  return !!value._v_isRef
}

export function ref(value) {
  const wrapper = {
    get value() {
      return value
    },
    set value(val) {
      value = val
    }
  }
  Object.defineProperty(wrapper, '_v_isRef', {
    // 默认 enumerable: false
    value: true
  })

  return reactive(wrapper)

}

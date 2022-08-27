import { reactive } from './reactive';

export function isRef(value) {
  return !!value._v_isRef
}

export function toRefs(obj) {
  const refs = {}
  for (const k in obj) {
    refs[k] = toRef(obj, k)
  }
  return refs
}

export function toRef(obj, key) {
  // 将 reactive 对象的某个值，转为 ref
  const wrapper = {
    get value() {
      return obj[key]
    },
    set value(newVal) {
      obj[key] = newVal
    }
  }

  Object.defineProperty(wrapper, '_v_isRef', {
    // 默认 enumerable: false
    value: true
  })

  return wrapper
}

export function ref(value) {
  const wrapper = {
    get value() {
      return value
    },
    set value(newVal) {
      value = newVal
    }
  }
  Object.defineProperty(wrapper, '_v_isRef', {
    // 默认 enumerable: false
    value: true
  })

  return reactive(wrapper)

}

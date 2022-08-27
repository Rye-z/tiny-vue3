import { reactive } from './reactive';

export function isRef(value) {
  return !!value._v_isRef
}

export function proxyRefs(obj) {
  return new Proxy(obj, {
    get(target, key, receiver) {
      const res = Reflect.get(target, key, receiver)
      // 自动脱 ref 实现
      return res._v_isRef ? res.value : res
    },
    set(target, key, val, receiver) {
      const value = target[key]
      // 这里需要区分 value 是 ref 还是普通值
      if (value._v_isRef) {
        // 如果是 ref，需要通过 ref.value 来修改值
        value.value = val
        return true
      }
      return Reflect.set(target, key, val, receiver)
    }
  })
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

import {
  track,
  trigger,
  triggerType
} from './effect.js';

export let ITERATE_KEY = Symbol()

function createReactive(obj) {
  return new Proxy(obj, {
    get(target, key, receiver) {
      const res = Reflect.get(target, key, receiver)
      track(target, key)
      return res
    },
    // 拦截 obj: key in obj
    has(target, key, receiver) {
      const res = Reflect.has(target, key, receiver)
      track(target, key)
      return res
    },
    set(target, key, val, receiver) {
      // 为什么不用 target.hasOwnProperty(key) ??? 这里的 target 必然是原始对象
      const type = target.hasOwnProperty(key)
        ? triggerType.SET
        : triggerType.ADD
      const res = Reflect.set(target, key, val, receiver)
      trigger(target, key, type)
      return res
    },
    // 拦截 `for...in`
    ownKeys(target) {
      // 因为 for...in 针对的是对象所有属性，所以无法用某个 key 来进行追踪
      // 故这里使用 Symbol 来作为 for...in 追踪的唯一标识
      // target - iterate_key - effect
      track(target, ITERATE_KEY)
      return Reflect.ownKeys(target)
    },
    deleteProperty(target, key) {
      // 检查是否为自身属性
      const hasKey = target.hasOwnProperty(key)
      const res = Reflect.deleteProperty(target, key)
      if (hasKey && res) {
        trigger(target, key, triggerType.DELETE)
      }
      return res
    }
  })
}

export function reactive(obj) {
  return createReactive(obj)
}

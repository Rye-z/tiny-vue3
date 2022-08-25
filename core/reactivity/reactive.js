import {
  track,
  trigger,
  triggerType
} from './effect.js';
import { equal } from '../utils';

export let ITERATE_KEY = Symbol()

function createReactive(
  obj,
  isShallow = false,
  isReadonly = false
) {
  return new Proxy(obj, {
    get(target, key, receiver) {
      if (key === 'raw') {
        return target
      }
      // 只读不需要被 track
      if (!isReadonly) {
        // 注意 track 的顺序，确保一定会执行
        track(target, key)
      }

      const res = Reflect.get(target, key, receiver)

      if (isShallow) {
        return res
      }
      if (typeof res === 'object' && res !== null) {
        // 一定要 return!
        return isReadonly ? readonly(res) : reactive(res)
      }

      return res
    },
    // 拦截 obj: key in obj
    has(target, key, receiver) {
      const res = Reflect.has(target, key, receiver)
      track(target, key)
      return res
    },
    set(target, key, newVal, receiver) {
      if (isReadonly) {
        console.warn(`${key} is readonly`)
        return true
      }

      const oldVal = target[key]
      /*  当对象为数组时:
          - key 为索引值
          - key < target.length => 不会影响数组长度 => SET 操作
          - key >= target.length => 会影响数组长度 => ADD 操作
      * */
      const type = Array.isArray(target)
        ? parseInt(key, 10) < target.length ? triggerType.SET: triggerType.ADD
        // 为什么不用 target.hasOwnProperty(key) ??? 这里的 target 必然是原始对象
        : target.hasOwnProperty(key) ? triggerType.SET : triggerType.ADD

      // 赋值操作依然要进行，并不是值不变就不进行操作了
      const res = Reflect.set(target, key, newVal, receiver)

      // 使用 Object.is() 可以同时处理 NaN 运算造成结果异常的边界情况
      if (equal(oldVal, newVal)) {
        return res
      }

      // 避免原型链的多次触发
      if (equal(receiver.raw, target)) {
        trigger(target, key, type, newVal)
      }

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
      if (isReadonly) {
        console.warn(`${key} is readonly`)
        return true
      }
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

export function shallowReactive(obj) {
  return createReactive(obj, true)
}

export function readonly(obj) {
  return createReactive(obj, false, true)
}

export function shallowReadonly(obj) {
  return createReactive(obj, true, true)
}

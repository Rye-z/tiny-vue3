import {
  track,
  trigger,
  triggerType
} from './effect.js';
import { equal } from '../utils';

export let ITERATE_KEY = Symbol()
const reactiveMap = new Map()

// ================ Start: hack Array methods ================
const originalMethod = Array.prototype.includes
const arrayInstrumentations = {
  includes(key) {
    // 先查找代理对象，this 是代理对象，因为 arr.includes 的 arr 是代理对象
    return originalMethod.call(this, key) || originalMethod.call(this.raw, key)
  }
}

// ================ End: hack Array methods ================

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
      // 1.只读不需要被 track 2. 内建 Symbol 不需要被 track，因为内建 Symbol 一般不需要修改
      if (!isReadonly && typeof key !== 'symbol') {
        // 注意 track 的顺序，确保一定会执行
        track(target, key)
      }

      if (Array.isArray(target)) {
        // arr.includes 会先读取 'includes' 属性
        if (arrayInstrumentations.hasOwnProperty(key)) {
          return Reflect.get(arrayInstrumentations, key, receiver)
        }
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
      if (Array.isArray(target)) {
        // 当数组 length 改变，会影响到 for...in 操作
        // 所以当 effect 中有数组的 for...in 操作时，需要将 `length` 和 ownKeys 建立响应关联
        track(target, 'length')
      } else {
        // 因为 for...in 针对的是对象所有属性，所以无法用某个 key 来进行追踪
        // 故这里使用 Symbol 来作为 for...in 追踪的唯一标识
        // target - iterate_key - effect
        track(target, ITERATE_KEY)
      }
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
  let existProxy = reactiveMap.get(obj)

  if (!existProxy) {
    reactiveMap.set(obj, (existProxy = createReactive(obj)))
  }
  return existProxy
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

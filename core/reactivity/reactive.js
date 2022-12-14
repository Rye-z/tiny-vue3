import {
  track,
  trigger,
  triggerType
} from './effect.js';
import {
  convert,
  equal,
  isMap,
  isSet
} from '../utils.js';

export let ITERATE_KEY = Symbol()
export let MAP_KEY_ITERATE_KEY = Symbol()
export let shouldTrack = true
const reactiveMap = new Map()

// ================ Start: hack Array methods ================
const arrayInstrumentations = {}

;['indexOf', 'lastIndexOf', 'includes'].forEach((method) => {
  const originalMethod = Array.prototype[method]
  arrayInstrumentations[method] = function(key) {
    let res = originalMethod.call(this, key)
    // indexOf 和 lastIndexOf 如果没有查找到，返回值是 -1，includes 是 false
    if (res === false || res === -1) {
      res = originalMethod.call(this.raw, key)
    }

    return res
  }
})

;['push', 'pop', 'shift', 'unshift', 'splice'].forEach(method => {
  const originalMethod = Array.prototype[method]
  // push 可以传入多个参数，所以使用 ...args 来接收参数，使用 apply 来调用函数
  arrayInstrumentations[method] = function(...args) {
    // 在调用原始方法前，禁止追踪
    shouldTrack = false
    let res = originalMethod.apply(this.raw, args)
    shouldTrack = true
    return res
  }
})
// ================ End: hack Array methods ================

// ================ Start: hack Set methods ================
let _mutableMethodName

// Map 和 Set 的方法大体相似，所以可以放在一起处理
function iterateMethod() {
  const target = this.raw
  /**
   * 获取迭代器对象
   * - Map.entries 等价于 target[Symbol.iterator]
   * - Map.values 通过 target.values 获取迭代器对象
   * - Map.keys 通过 target.keys 获取迭代器对象
   */
  const iterator = target[_mutableMethodName]()

  /**
   * 依赖收集分离
   * - values/entries 通过 ITERATE_KEY 收集依赖
   * - keys 通过 MAP_KEY_ITERATE_KEY 收集依赖
   *    - Map.set(k, v)，k 是不变的，不应该触发 Map.keys 的 effect
   */
  if (_mutableMethodName === 'keys') {
    track(target, MAP_KEY_ITERATE_KEY)
  } else {
    track(target, ITERATE_KEY)
  }

  // 自定义迭代器
  return {
    // 一个对象可以同时实现 可迭代协议 和 迭代器协议：比如生成器
    next() {
      const { value, done } = iterator.next()
      return {
        done,
        // 对迭代过程中的值进行包装
        value: value
          ? (
            value.length === 2
              ? [convert(value[0]), convert(value[1])]
              // values 只有一个值
              : convert(value)
          )
          : value
      }
    },
    // p.entries is not a function or its return value is not iterable
    [Symbol.iterator]() {
      return this
    }
  }
}

const mutableInstrumentations = {
  [Symbol.iterator]: iterateMethod,
  entries: iterateMethod,
  values: iterateMethod,
  keys: iterateMethod,
  // forEach 接收第二个参数 thisArg
  forEach(callback, thisArg) {
    const target = this.raw
    // 通过 wrap 将可代理的值转化为响应式数据
    track(target, ITERATE_KEY)
    // callback
    target.forEach((v, k) => {
      // this 是代理对象
      callback.call(thisArg, convert(v), convert(k), this)
    })
  },
  // Map 和 Set 的 get 和 Object.property 不一样
  get(key) {
    const target = this.raw
    const res = target.get(key)
    track(target, key)
    if (res) {
      return convert(res)
    }
  },
  set(key, value) {
    // Map.set 需要区分是 ADD 方法还是 SET 方法 -> 两种不同的触发方式
    // - ADD => ITERATE_KEY
    const target = this.raw
    const hasKey = target.has(key)
    const oldVal = target.get(key)
    // 防止原始数据污染，需要判断是否将代理对象赋值给了原始值
    const rawVal = value.raw || value
    target.set(key, rawVal)
    // 判断 type
    const type = hasKey ? triggerType.SET : triggerType.ADD
    // 新值和旧值不同才触发， ADD 类型一定是不同的：旧值为 undefined
    if (!equal(rawVal, oldVal)) {
      trigger(target, key, type)
    }

  },
  add(key) {
    // 调用者是代理对象，所以 this 也就代理对象
    const target = this.raw
    const hasKey = target.has(key)
    const res = target.add(key)
    if (!hasKey) {
      // 指定操作类型为 ADD
      trigger(target, ITERATE_KEY, triggerType.ADD)
    }
    return res
  },
  delete(key) {
    const target = this.raw
    const hasKey = target.has(key)
    const res = target.delete(key)
    if (hasKey) {
      // 指定操作类型为 DELETE
      trigger(target, ITERATE_KEY, triggerType.DELETE)
    }
    return res
  }
}

// ================ End: hack Set methods ================

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
      // ================ Start: Set/Map methods ================
      if (isSet(target) || isMap(target)) {
        if (key === 'size') {
          track(target, ITERATE_KEY)
          // 因为 Proxy 上没有部署 [[SetData]] 这个内部方法，所以需要将 target 作为 receiver
          return Reflect.get(target, key, target)
        }
        _mutableMethodName = key
        return mutableInstrumentations[key]
      }
      // ================ End: Set/Map methods ================

      // ================ Start: Array methods ================
      if (Array.isArray(target)) {
        // arr.includes 会先读取 'includes' 属性
        if (arrayInstrumentations.hasOwnProperty(key)) {
          return Reflect.get(arrayInstrumentations, key, receiver)
        }
      }
      // ================ End: Array methods ================

      // 1.只读不需要被 track 2. 内建 Symbol 不需要被 track，因为内建 Symbol 一般不需要修改
      if (!isReadonly && typeof key !== 'symbol') {
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
        ? parseInt(key, 10) < target.length ? triggerType.SET : triggerType.ADD
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
    /**
     * 拦截 `for...in`
     * 因为 for...in 操作其中有一步是通过 Reflect.ownKeys() 来获取对象自身拥有的
     * 然后通过迭代器 GetV(iterator, 'next')
     */
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

import {
  ITERATE_KEY,
  MAP_KEY_ITERATE_KEY,
  shouldTrack
} from './reactive.js';
import {
  extend,
  isMap
} from '../utils.js';
import {
  createDep,
  finalizeDepMarkers,
  initDepMarkers,
  newTracked,
  wasTracked
} from './dep.js';

let activeEffect = null
const effectStack = []
const bucket = new WeakMap()

// The number of effects currently being tracked recursively.
let effectTrackDepth = 0

export let trackOpBit = 1

/**
 * The bitwise track markers support at most 30 levels of recursion.
 * This value is chosen to enable modern JS engines to use a SMI on all platforms.
 * When recursion depth is greater, fall back to using a full cleanup.
 */
const maxMarkerBits = 30

export const triggerType = {
  ADD: 'ADD',
  SET: 'SET',
  DELETE: 'DELETE'
}

class ReactiveEffect {
  constructor(fn, scheduler = null) {
    this.fn = fn
    this.scheduler = scheduler
    this.deps = []
  }

  run() {
    if (!effectStack.includes(this)) {
      try {
        // 压栈
        effectStack.push(activeEffect = this)
        // 根据递归深度记录位数
        trackOpBit = 1 << ++effectTrackDepth

        if (effectTrackDepth <= maxMarkerBits) {
          // 标记 deps 中的依赖为 wasTracked
          initDepMarkers(this.deps)
        } else {
          cleanupEffects(this)
        }
        return this.fn()
      } finally {
        if (effectTrackDepth <= maxMarkerBits) {
          finalizeDepMarkers(this)
        }
        // 恢复到上一级
        trackOpBit = 1 << --effectTrackDepth
        // 出栈
        effectStack.pop()
        // 恢复到之前的值
        const n = effectStack.length
        activeEffect = n > 0 ? effectStack[n - 1] : undefined
      }
    }
  }
}

export function effect(fn, options = {
  scheduler: null,
  lazy: false
}) {
  const _effect = new ReactiveEffect(fn)
  if (options) {
    extend(_effect, options)
  }

  if (!options.lazy) {
    return _effect.run()
  }

  const runner = _effect.run.bind(_effect)
  runner.effect = _effect

  return runner
}

export function track(target, key) {
  let depsMap = bucket.get(target)
  if (!depsMap) {
    bucket.set(target, depsMap = new Map())
  }
  let deps = depsMap.get(key)
  if (!deps) {
    depsMap.set(key, deps = createDep())
  }

  trackEffects(deps)
}

export function trigger(target, key, type, newVal) {
  const depsToRun = getDepsToRun()

  let depsMap = bucket.get(target)
  if (!depsMap) {
    return
  }
  let deps = depsMap.get(key)

  // 收集当前 obj.key 的deps
  depsToRun.add(deps)

  if (Array.isArray(target)) {
    if (type === triggerType.ADD) {
      const lengthDeps = depsMap.get('length')
      depsToRun.add(lengthDeps)
    }
    /*  当对象为数组时:
        - key 为索引值
        - key < target.length => 不会影响数组长度 => SET 操作
        - key >= target.length => 会影响数组长度 => ADD 操作
    * */
    if (key === 'length') {
      /*  当对象为数组时:
          - key 为索引值
          - arr.length = newIndex
            - 所有 index >= newIndex -> trigger(arr, index)
      * */
      // 因为是数组，index 也就是属性值
      depsMap.forEach((deps, index) => {
        // newVal 是 length 的新值
        if (index >= newVal) {
          depsToRun.add(deps)
        }
      })
    }
  }

  // 收集 obj.ITERATE_KEY 的 deps
  if (
    type === triggerType.ADD
    || type === triggerType.DELETE
    // Map.set 应触发 for...of / entries / values 副作用
    || (isMap(target) && type === triggerType.SET)
  ) {
    // ADD 或 DELETE 应触发 for...in 副作用
    const iterateDeps = depsMap.get(ITERATE_KEY)
    depsToRun.add(iterateDeps)
  }

  if (
    // Map.set 和 Map.delete 会影响 Map.keys，因为对 key 产生了影响
    (type === triggerType.ADD || type === triggerType.DELETE)
    && (isMap(target))
  ) {
    const mapKeyIterateDeps = depsMap.get(MAP_KEY_ITERATE_KEY)
    depsToRun.add(mapKeyIterateDeps)
  }

  triggerEffects(depsToRun.effects)
}

export function trackEffects(deps) {
  /**
   * 需要判断是否存在 activeEffect，只有在设置 effect(fn) 的时候，对应的 activeEffect 才是应该收集的 effectFn
   * 仅仅是属性访问不需要添加副作用函数
   */
  if (!activeEffect) return

  let shouldTrack = false

  if (effectTrackDepth <= maxMarkerBits) {
    if (!newTracked(deps)) {
      // 标记为新依赖
      deps.n |= trackOpBit
      // 如果依赖已经被收集，不需要再次收集依赖
      shouldTrack = !wasTracked(deps)
    }
  } else {
    // cleanup 模式
    shouldTrack = !deps.has(activeEffect)
  }

  if (shouldTrack) {
    deps.add(activeEffect)
    activeEffect.deps.push(deps)
  }

}

function cleanupEffects(effect) {
  effect.deps.forEach(deps => {
    // target
    //  - deps
    //    - effect
    // effect 存储的是 deps -> 先遍历删除当前的 effect
    deps.delete(effect)
  })
  // 清空当前 effect 的 deps
  effect.deps.length = 0
}

function triggerEffects(deps) {
  deps.forEach(effect => {
    if (effect.scheduler) {
      effect.scheduler(effect.fn)
    } else {
      effect.run()
    }
  })
}

function getDepsToRun() {
  /* 当执行 effect 时，先 cleanUp 遗留的副作用函数，但是执行 effectFn，又会触发属性访问，在遍历的时候又会将 effect 添加到 deps 中
     相当于
     set = new Set([1])
     set.forEach(item => {
       set.delete(1)
       set.add(1)
     })
     使用一个新的 Set 来进行遍历，防止无限循环
   */
  const effects = new Set()
  return {
    effects,
    add(deps) {
      deps && deps.forEach(effect => {
        // 防止嵌套 effect 无限嵌套调用 activeEffect 表示当前正在运行的 effect
        if (effect !== activeEffect) {
          effects.add(effect)
        }
      })
    }
  }
}


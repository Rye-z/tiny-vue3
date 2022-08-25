import { ITERATE_KEY } from './reactive';

let activeEffect = null
const effectStack = []
const bucket = new WeakMap()

export const triggerType = {
  ADD: 'ADD',
  SET: 'SET',
  DELETE: 'DELETE'
}

export function effect(fn, options = {
  scheduler: null,
  lazy: false
}) {
  const effectFn = () => {
    cleanupEffects(effectFn)
    activeEffect = effectFn
    // 先将当前的 effect 入栈
    effectStack.push(effectFn)
    // 执行
    const res = fn()
    // 将当前副作用函数弹出
    effectStack.pop()
    /*
    * 注意：如果不是嵌套 effect，activeEffect 的值会被置为 undefined
    * */
    // 恢复到之前的值
    activeEffect = effectStack[effectStack.length - 1]
    // computed 需要运算结果
    return res
  }
  effectFn.deps = []
  effectFn.options = options
  if (options.lazy) {
    return effectFn
  }
  effectFn()
}

export function track(target, key) {
  let depsMap = bucket.get(target)
  if (!depsMap) {
    bucket.set(target, depsMap = new Map())
  }
  let deps = depsMap.get(key)
  if (!deps) {
    depsMap.set(key, deps = new Set())
  }
  /**
   * 需要判断是否存在 activeEffect，只有在设置 effect(fn) 的时候，对应的 activeEffect 才是应该收集的 effectFn
   * 仅仅是属性访问不需要添加副作用函数
   */
  if (!activeEffect) return

  deps.add(activeEffect)
  activeEffect.deps.push(deps)
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
  if (type === triggerType.ADD || type === triggerType.DELETE) {
    const iterateDeps = depsMap.get(ITERATE_KEY)
    depsToRun.add(iterateDeps)
  }

  triggerEffects(depsToRun.effects)
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
    if (effect.options.scheduler) {
      effect.options.scheduler(effect)
    } else {
      effect()
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


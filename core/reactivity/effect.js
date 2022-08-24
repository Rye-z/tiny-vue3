let activeEffect = null
const effectStack = []
const bucket = new WeakMap()

export function effect(fn) {
  const effectFn = () => {
    cleanupEffects(effectFn)
    activeEffect = effectFn
    // 先将当前的 effect 入栈
    effectStack.push(effectFn)
    // 执行
    fn()
    // 将当前副作用函数弹出
    effectStack.pop()
    // 恢复到之前的值
    activeEffect = effectStack[effectStack.length - 1]
  }
  effectFn.deps = []
  effectFn()
}

export function track(target, key) {
  let depsMap = bucket.get(target)
  if (!depsMap) {
    bucket.set(target, depsMap = new Map())
  }
  let deps = depsMap.get(key)
  if (!deps) {
    depsMap.set(key, deps=new Set())
  }
  deps.add(activeEffect)
  activeEffect.deps.push(deps)
}

export function trigger(target, key) {
  let depsMap = bucket.get(target)
  if (!depsMap) {
    return
  }
  let deps = depsMap.get(key)
  if (!deps) {
    return
  }
  // 当执行 effect 时，先 cleanUp 遗留的副作用函数，但是执行 effectFn，又会触发属性访问，在遍历的时候又会将 effect 添加到 deps 中
  // 相当于
  // set = new Set([1])
  // set.forEach(item => {
  //   set.delete(1)
  //   set.add(1)
  // })
  // 使用一个新的 Set 来进行遍历，防止无限循环
  const depsToRun = new Set(deps)
  triggerEffects(depsToRun)
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
    // 避免无限递归循环 obj.foo++
    // 同时 get + set -> 在运行当前 effect 未结束时，又调用了当前 effect
    if(activeEffect !== effect) {
      effect()
    }
  })
}


let activeEffect = null
const bucket = new WeakMap()

export function effect(fn) {
  activeEffect = fn
  fn()
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
  deps.forEach(effect => effect())
}

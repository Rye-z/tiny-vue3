import {
  effect,
  track,
  trigger
} from './effect';

export function computed(getter) {
  let dirty = true
  let cache

  const runner = effect(getter, {
    lazy: true,
    scheduler() {
      // 在 trigger 也就是响应式数据发生改变的时候，将 dirty 设为 true
      // 这里 scheduler 中不需要执行 effectFn，因为已经 effect 已经返回了 runner
      // 可以在 get value() 时手动执行
      dirty = true
      // 触发 getter 执行
      trigger(obj, 'value')
    }
  })

  const obj = {
    get value() {
      if (dirty) {
        // effect(() => computed(getter).value)
        cache = runner()
        // 对 'value' 进行 track
        track(obj,'value')
        dirty = false
      }
      return cache
    }
  }
  return obj
}

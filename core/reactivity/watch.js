import { effect } from './effect';


function traverse(value, seen) {
  if (typeof value !== 'object' || value === null || seen.has(value)) {
    return
  }
  // 添加到 seen 中，防止循环引用造成的死循环
  seen.add(value)
  // 暂不考虑其他数据结构，仅考虑 Object
  for (const key in value) {
    traverse(value[key], seen)
  }

  return value
}

export function watch(source, cb) {
  const seen = new Set()
  let getter
  let newVal, oldVal

  if (typeof source === 'function') {
    getter = source
  } else {
    getter = traverse(source, seen)
  }

  // 因为需要获取 getter 函数的返回值，所以设置 lazy，并且手动执行 runner
  const runner = effect(getter, {
    lazy: true,
    scheduler() {
      newVal = runner()
      cb(newVal, oldVal)
      oldVal = newVal
    }
  })
  oldVal = runner()
}

import { effect } from './effect';

/**
 * 因为 getter 函数会被重复调用，所以 seen 不能声明在 traverse 外部
 * 假设 seen 声明在 watch 函数中，则会作为一个闭包变量一直存在
 * 当 cleanupEffects 执行之后，由于 seen 中元素没有被清除
 * 所以之后调用 traverse 时，所有已经遍历过的属性就不会再被 track
 */
function traverse(value, seen = new Set()) {
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

export function watch(source, cb, options = {
  immediate: false
}) {
  let getter
  let newVal,
    oldVal

  if (typeof source === 'function') {
    getter = source
  } else {
    getter = () => traverse(source)
  }
  /* 原本是 trigger 时（响应值改变）才会运行 scheduler
  *  所以将 scheduler 的内容单独抽取为一个独立函数，这样可以自由调用
  * */
  const job = () => {
    newVal = runner()
    cb(newVal, oldVal)
    oldVal = newVal
  }

  // 因为需要获取 getter 函数的返回值，所以设置 lazy，并且手动执行 runner
  const runner = effect(
    getter,
    {
      lazy: true,
      scheduler: job
    }
  )

  if (options.immediate) {
    job()
  } else {
    // 手动调用获取初始值 => 执行 getter 函数
    // 第一次执行的时候，没有旧值，oldVal 是 undefined 符合预期
    oldVal = runner() // 这里只是执行了 getter 函数，并没有触发 scheduler
  }
}

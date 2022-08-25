import {
  reactive,
  readonly,
  shallowReactive,
  shallowReadonly
} from '../reactive.js';
import { effect } from '../effect';

describe('effect', function() {
  it('should observe basic properties', function() {
    let dummy
    const counter = reactive({ num: 0 })
    effect(() => (dummy = counter.num + 1))

    expect(dummy).toBe(1)
    counter.num = 7
    expect(dummy).toBe(8)
  });

  it('分支切换 / 清除遗留副作用函数', function() {
    let text
    const obj = reactive({ ok: true, text: 'hello' })

    const fn = jest.fn(() => {
      text = obj.ok ? obj.text : 'sorry'
    })
    effect(fn)
    expect(fn).toHaveBeenCalledTimes(1)

    expect(text).toBe('hello')
    obj.ok = false
    expect(fn).toHaveBeenCalledTimes(2)
    expect(text).toBe('sorry')
    /**
     * 1.分支切换：因为 obj.ok 为 false，所以 obj.text 永远不会执行
     *   所以当 obj.text 改变时，副作用函数不应该被触发
     */
    obj.text = 'change'
    expect(fn).toHaveBeenCalledTimes(2)
  });

  it('嵌套 effect', function() {
    let obj = reactive({ foo: 'foo', bar: 'bar' })
    const fn1 = jest.fn(() => () => console.log('fn1'))
    const fn2 = jest.fn(() => () => console.log('fn2'))

    effect(() => {
      fn1()
      effect(() => {
        fn2()
        obj.foo
      })
      obj.bar
    })
    expect(fn1).toHaveBeenCalledTimes(1)
    expect(fn2).toHaveBeenCalledTimes(1)
    obj.foo = 1
    // obj.foo 在内层 effect，obj.foo 改变时不应该触发外层 effect
    expect(fn1).toHaveBeenCalledTimes(1)
    expect(fn2).toHaveBeenCalledTimes(2)
    // obj.bar 在外层，因为内层还嵌套了一个 effect()，所以会同时触发内层的 effect
    // => fn1 和 fn2 都会被调用
    obj.bar = 1
    expect(fn1).toHaveBeenCalledTimes(2)
    expect(fn2).toHaveBeenCalledTimes(3)
  });

  it('避免无限递归循环', function() {
    const obj = reactive({ foo: 1 })
    effect(() => {
      // 同时 get + set -> 在运行当前 effect 未结束时，又调用了当前 effect
      obj.foo++
    })
  });

  it('set 值不变时，不触发副作用函数', function() {
    const obj = reactive({ foo: 1 })
    const fn = jest.fn(() => obj.foo)
    effect(fn)
    expect(fn).toHaveBeenCalledTimes(1)
    obj.foo = 1
    expect(fn).toHaveBeenCalledTimes(1)
    obj.foo++
    expect(fn).toHaveBeenCalledTimes(2)
  });

  it('NaN 值边界处理', function() {
    const obj = reactive({ foo: 1, bar: NaN })
    const fn = jest.fn(() => obj.foo)
    effect(fn)
    expect(fn).toHaveBeenCalledTimes(1)
    obj.bar = NaN
    expect(fn).toHaveBeenCalledTimes(1)
  });

  it('监听 key in obj', function() {
    const obj = reactive({ foo: 1 })
    const fn = jest.fn(() => {
      'foo' in obj
    })
    effect(fn);
    expect(fn).toHaveBeenCalledTimes(1)

    obj.foo++
    expect(fn).toHaveBeenCalledTimes(2)
  });

  it('监听 for...in', function() {
    const obj = reactive({ foo: 1 })
    const fn = jest.fn(() => {
      // 新增或者删除属性的时候，会对 for...in 造成影响
      for (const k in obj) {}
    })

    effect(fn)
    expect(fn).toHaveBeenCalledTimes(1)
    // 新增属性
    obj.bar = 1
    expect(fn).toHaveBeenCalledTimes(2)
  });

  it('对象已有属性的修改不触发 for...in 副作用', function() {
    const obj = reactive({ foo: 1 })
    const fn = jest.fn(() => {
      // 新增或者删除属性的时候，会对 for...in 造成影响
      for (const k in obj) {}
    })
    effect(fn)
    expect(fn).toHaveBeenCalledTimes(1)
    obj.foo++
    expect(fn).toHaveBeenCalledTimes(1)
  });

  it('删除对象属性触发 for...in 副作用', function() {
    const obj = reactive({ foo: 1 })
    const fn = jest.fn(() => {
      // 新增或者删除属性的时候，会对 for...in 造成影响
      for (const k in obj) {}
    })
    effect(fn)
    expect(fn).toHaveBeenCalledTimes(1)
    delete obj.foo
    expect(fn).toHaveBeenCalledTimes(2)
  });

  it('原型链上的属性不应触发副作用函数', function() {
    const child = reactive({})
    const parent = reactive({ bar: 1 })
    Object.setPrototypeOf(child, parent)

    /**
     * 1. 先访问 child.bar -> track(child, 'bar')
     * 2. 因为 child 没有 'bar' 属性，所以会按照 __proto__ 查找，访问 parent.bar -> track(parent, 'bar')
     * 3. 所以 child.bar 和 parent.bar 添加了同一个副作用函数
     */

    const fn = jest.fn(() => child.bar)

    effect(fn)
    expect(fn).toHaveBeenCalledTimes(1)

    /* 1. 调用 child.[[Set]] -> trigger(child, bar)；但如果设置的值不再对象上，会获取原型，调用原型上的 [[Set]] 方法
       2. 根据 ECMA 规范：如果 parent 不是 null，返回 ? parent.[[Set]](P, V, receiver)
          - receiver 还是 child，所以最终是对 child.bar 设置值，但是
       所以 fn 会被触发两次
       3. 处理方式：
          - 由于 receiver 的存在，我们可以判断 target 和 receiver 是否同一个对象来规避原型链上属性的多次触发
    * */
    child.bar = 2
    expect(fn).toHaveBeenCalledTimes(2)
  });

  it('shallowReactive', function() {
    const obj = shallowReactive({ foo: { bar: 1 } })
    const fn = jest.fn(() => obj.foo.bar)

    effect(fn)
    expect(fn).toHaveBeenCalledTimes(1)

    obj.foo.bar++
    expect(fn).toHaveBeenCalledTimes(1)
  });

  it('readonly', function() {
    let warnMsg
    const spy = jest.spyOn(console, 'warn')
    spy.mockImplementation((msg) => {
      warnMsg = msg
    })
    const obj = readonly({ foo: { bar: 1 } })

    obj.foo.bar++
    expect(obj.foo.bar).toBe(1)

    expect(spy).toHaveBeenCalledTimes(1)
    expect(warnMsg).toBe('bar is readonly')
    spy.mockRestore()
  });

  it('shallowReadonly', function() {
    let warnMsg
    const spy = jest.spyOn(console, 'warn')
    spy.mockImplementation((msg) => {
      warnMsg = msg
    })

    const obj = shallowReadonly({ foo: { bar: 1 }, text: 'John' })
    obj.foo.bar++
    expect(obj.foo.bar).toBe(2)
    obj.text = 'Lily'
    expect(obj.text).toBe('John')

    expect(spy).toHaveBeenCalledTimes(1)
    expect(warnMsg).toBe('text is readonly')
    spy.mockRestore()
  });

  it('arr[index] index >= arr.length 时 ，触发 length 副作用', function() {
    /*  当对象为数组时:
        - key 为索引值
        - key < target.length => 不会影响数组长度 => SET 操作
        - key >= target.length => 会影响数组长度 => ADD 操作
    * */
    const arr = reactive([])
    const fn = jest.fn(() => arr.length)
    effect(fn)
    expect(fn).toHaveBeenCalledTimes(1)
    // length: 0 -> 1
    arr[0] = 1
    expect(fn).toHaveBeenCalledTimes(2)
  });

  it('修改 arr.length，隐式影响数组元素', function() {
    /*  当对象为数组时:
        - key 为索引值
        - arr.length = newIndex
          - 所有 index >= newIndex -> trigger(arr, index)
    * */
    const arr = reactive([1, 2, 3])
    const fn1 = jest.fn(() => arr[0])
    const fn2 = jest.fn(() => arr[1])
    const fn3 = jest.fn(() => arr[2])

    effect(fn1)
    effect(fn2)
    effect(fn3)

    expect(fn1).toHaveBeenCalledTimes(1)
    expect(fn2).toHaveBeenCalledTimes(1)
    expect(fn3).toHaveBeenCalledTimes(1)

    arr.length = 3
    expect(fn1).toHaveBeenCalledTimes(1)
    expect(fn2).toHaveBeenCalledTimes(1)
    expect(fn3).toHaveBeenCalledTimes(1)

    arr.length = 1
    expect(fn1).toHaveBeenCalledTimes(1)
    expect(fn2).toHaveBeenCalledTimes(2)
    expect(fn3).toHaveBeenCalledTimes(2)
  });
});

describe('scheduler', () => {
  it('使用 scheduler 控制调度时机', function() {
    jest.useFakeTimers()
    const obj = reactive({ foo: 1 })
    let bar

    effect(() => {
      bar = obj.foo
    }, {
      scheduler(fn) {
        setTimeout(fn)
      }
    })
    obj.foo = 0

    bar = 3
    jest.runAllTimers()
    expect(bar).toBe(0)
  });

  it('连续多次修改响应式数据，只触发一次更新', async function() {
    // 创建一个 promise 实例，利用它将一个微任务添加到微任务队列
    const p = Promise.resolve()
    const jobQueue = new Set()
    // 是否正在刷新队列
    let isFlushing = false

    function flushJob() {
      if (isFlushing) {
        return
      }
      isFlushing = true
      // 在微任务队列中刷新 jobQueue()
      p.then(() => {
        jobQueue.forEach(job => job())
      }).finally(() => {
        isFlushing = false
      })
    }

    const obj = reactive({ foo: 1 })

    const fn = jest.fn(() => obj.foo)

    effect(fn, {
      scheduler(fn) {
        // 每次调度时将 fn 放到微任务队列
        jobQueue.add(fn)
        flushJob()
      }
    })
    obj.foo++
    obj.foo++
    obj.foo++
    obj.foo++

    await Promise.resolve()
    /* 这是一个模拟：
       - 在 Vue 中实现了一个很完善的调度器
       - 连续多次修改响应式数据，但是只会触发一次更新
    * */
    expect(fn).toHaveBeenCalledTimes(2)
    expect(obj.foo).toBe(5)
  });
});

import { reactive } from '../reactive.js';
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

  it('分支切换 / 清除遗留富副作用函数', function() {
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

import { reactive } from '../reactive';
import { effect } from '../effect';

describe('scheduler', () => {
  it(
    '使用 scheduler 控制调度时机',
    function() {
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
    }
  );

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
    expect(fn).toHaveBeenCalledTimes(1)
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

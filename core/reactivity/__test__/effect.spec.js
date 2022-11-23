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

  it('对同一属性的读写造成的无限循环', function() {
    const data = { value: 1, value2: 1 }
    const obj = reactive(data)
    effect(() => {
      obj.value++
    })
    effect(() => {
      obj.value++
    })
  });

  it('should ', function() {
    const data = { value: 1}
    const obj = reactive(data)
    effect(() => {
      obj.value++
      obj.value++
    })

    obj.value++
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

  it('数组 for...in', function() {
    const arr = reactive([1, 2, 3])
    const fn = jest.fn(() => {
      for (const index in arr) {}
    })
    effect(fn)
    expect(fn).toHaveBeenCalledTimes(1)
    /**
     * 当 arr.length 改变，会影响到 for...in 操作
     * - 1. 设置元素 arr[index] = 100，index > arr.length 时
     * - 2. 修改 length 属性是，arr.length = 0
     */
    arr[100] = 100
    expect(fn).toHaveBeenCalledTimes(2)
    arr.length = 0
    expect(fn).toHaveBeenCalledTimes(3)
  });

  it('数组 for...of', function() {
    const arr = reactive([1, 2, 3])
    const fn = jest.fn(() => {
      for (const index of arr) {}
    })
    effect(fn)
    expect(fn).toHaveBeenCalledTimes(1)
    /**
     * 迭代数组时只需要在副作用函数和数组的长度和索引之间建立响应联系，就能够实现 for...of 迭代
     * 但需要知道 for...of 会读取 [Symbol.iterator] 属性
     * 内建 Symbol 一般是不会修改的，所以 Symbol 不应该被 track
     */
    arr[100] = 100
    expect(fn).toHaveBeenCalledTimes(2)
    arr.length = 0
    expect(fn).toHaveBeenCalledTimes(3)
  });

  it('arrProxy.includes(arrProxy[0])', function() {
    const rawObj = {}
    const arrProxy = reactive([rawObj])

    /*
    ==> EMCAScript 数组 includes 的执行流程
      - 1. 让 O 的值为 ？ToObject(this value)
        - this value 指的是代理对象
      - 10. 重复，while（k < len）
        - a. 让 elementK 的值为 ? Get(0, ！ToString((K)))
        - b. 如果 SameValueZero(searchElement, elementK) 是 true，返回 true
        - 将 k 设置为 k + 1
    ==> 可以看出 `includes` 会通过索引来读取数组的值
      - 但是在 10-b 比较这一步：searchElement 和 elementK 并不是同一个值
        - 这是因为 `reactive` 默认将对象递归代理
          - `arr[0]` 是 一个对象
            - `arr[0]` 会创建一个新的代理对象，假设为 **Proxy_a**
            - `includes` 会遍历每个索引创建代理对象，假设为 **Proxy_b_index**
            - **Proxy_a** 和 **Proxy_b_index** 一定是不相等的

    ==> 使用一个 reactiveMap 来存储原始值和代理的映射关系
    * */
    expect(arrProxy.includes(arrProxy[0])).toBe(true)
  });

  it('arrProxy.includes(rawObj)', function() {
    const rawObj = {}
    const arrProxy = reactive([rawObj])
    expect(arrProxy.includes(rawObj)).toBe(true)
  });

  it('arrProxy.indexOf/lastIndexOf(rawObj)', function() {
    const rawObj = {}
    const arrProxy = reactive([rawObj])

    expect(arrProxy.indexOf(rawObj)).toBe(0)
    expect(arrProxy.indexOf(arrProxy[0])).toBe(0)

    expect(arrProxy.lastIndexOf(rawObj)).toBe(0)
    expect(arrProxy.lastIndexOf(arrProxy[0])).toBe(0)
  });

  it('arrProxy.push', function() {
    /**
     * arr.push() 会有两步操作：
     * - 1. 读取 arr.length
     * - 2. 设置 arr.length
     * arr.push 可以传多个参数
     */
    const arrProxy = reactive([])
    const fn1 = jest.fn(() => arrProxy.push(1))
    const fn2 = jest.fn(() => arrProxy.push(2))
    /**
     * 这里可能会出现栈溢出的问题
     * 本质上是两个独立的副作用函数中，对 **同一对象** 的 **同一属性** 在一个函数中进行了 【读】和【写】两个操作
     * - 因为是同一个属性
     *   - 读的时候：track(effect)
     *   - 写的时候：trigger(effect) → 这里会触发另一个副作用函数 → track → trigger
     * - 等于是当前副作用函数还没执行完，又触发了另一个副作用函数，然后就不停地相互触发
     */
    effect(fn1)
    effect(fn2)
    expect(fn1).toHaveBeenCalledTimes(1)
    expect(fn2).toHaveBeenCalledTimes(1)
  });

  it('Set.size', function() {
    const setProxy = reactive(new Set([1, 2, 3]))
    const fn = jest.fn(() => setProxy.size)

    effect(fn)
    expect(fn).toHaveBeenCalledTimes(1)
  });

  it('Set.delete', function() {
    const setProxy = reactive(new Set([1, 2, 3]))
    const fn = jest.fn(() => setProxy.size)

    effect(fn)
    expect(fn).toHaveBeenCalledTimes(1)
    setProxy.delete(1)
  });

  it('add 和 delete 方法应当触发 size 副作用', function() {
    const setProxy = reactive(new Set([1, 2, 3]))
    const fn = jest.fn(() => setProxy.size)

    effect(fn)
    expect(fn).toHaveBeenCalledTimes(1)

    setProxy.add(4)
    expect(fn).toHaveBeenCalledTimes(2)
    setProxy.delete(1)
    expect(fn).toHaveBeenCalledTimes(3)

  });

  it('Map 避免数据污染', function() {
    // 数据污染：将响应式数据设置到原始数据上的行为
    const m = new Map()
    const p1 = reactive(m)
    const p2 = reactive(new Map())
    p1.set('p2', p2)
    const fn = jest.fn(() => m.get('p2').size)

    // effect 不应该对原始数据监听
    effect(fn)
    expect(fn).toHaveBeenCalledTimes(1)

    m.get('p2').set('foo', 1)
    expect(fn).toHaveBeenCalledTimes(1)
  });

  it('Map.set 触发 forEach 副作用', function() {
    const p = reactive(new Map([[{ key: 1 }, { value: 1 }]]))
    const fn = jest.fn(() => {
      p.forEach(i => i)
    })
    effect(fn)
    expect(fn).toHaveBeenCalledTimes(1)

    p.set(2, 2)
    expect(fn).toHaveBeenCalledTimes(2)
  });

  it('Map forEach 回调函数的参数应自动转为响应式数据', function() {
    const key = { key: 1 }
    const value = new Set([1, 2, 3])
    const p = reactive(new Map().set(key, value))
    const fn = jest.fn(() => {
      p.forEach((value, _) => value.size)
    })
    effect(fn)
    expect(fn).toHaveBeenCalledTimes(1)

    p.get(key).delete(1)
    expect(fn).toHaveBeenCalledTimes(2)
  });

  it('Map.set 修改值的时候也应该触发 forEach 副作用', function() {
    /**
     * for...in 遍历对象 和 forEach 遍历集合 之间存在本质的不同：
     * - for...in 只关心对象的键，而不关心值，所以只有在 【新增键】或者【删除键】的时候需要触发 effect
     * - forEach 遍历集合的时候分情况：
     *    - Set 只有值
     *      - add / delete => 任何影响到 Set.size 的操作
     *    - Map 既有值也有键
     *      - Map 的键可以是对象，所以 Map 的键值改变都应该触发 effect
     */
    const p = reactive(new Map().set('key', 1))
    const fn = jest.fn(() => {
      p.forEach((value, key) => [key, value])
    })
    effect(fn)
    expect(fn).toHaveBeenCalledTimes(1)
    p.set('key', 2)
    expect(fn).toHaveBeenCalledTimes(2)
  });

  it('Map 的迭代器方法', function() {
    // todo ??? 为啥数组的代理对象可以直接使用 `for..of` 遍历
    // TypeError: p is not iterable
    const p = reactive(new Map([['key1', 'value1']]))
    const fn = jest.fn(() => {
      for (const [key, value] of p) {
        [key, value]
      }
    })
    effect(fn)
    expect(fn).toHaveBeenCalledTimes(1)
    p.set('key2', 'value2')
    expect(fn).toHaveBeenCalledTimes(2)
  });

  it('Map for...of 迭代产生的值如果是对象，也应该被代理', function() {
    const key = { key: 1 }
    const value = { value: 1 }
    const p = reactive(new Map([
      [key, value]
    ]))
    const fn = jest.fn(() => {
      for (const [k, v] of p) {
        expect(k.raw === key).toBe(true)
        expect(v.raw === value).toBe(true)
      }
    })
    effect(fn)
    expect(fn).toHaveBeenCalledTimes(1)
  });

  it('Map for...of 迭代产生的代理对象被修改时，应触发 for...of 副作用', function() {
    const key = { key: 1 }
    const key2 = { key2: 2 }
    const mapValue = new Map().set('bar', 1)
    const objValue = { foo: 1 }
    const p = reactive(new Map([
      [key, mapValue],
      [key2, objValue]
    ]))
    const fn = jest.fn(() => {
      for (const [k, v] of p) {
        [k, v.foo || v.get('bar')]
      }
    })

    effect(fn)
    expect(fn).toHaveBeenCalledTimes(1)
    p.get(key2)['foo'] = 2
    expect(fn).toHaveBeenCalledTimes(2)
    p.get(key).set('bar', 2)
    expect(fn).toHaveBeenCalledTimes(3)
    // 修改相同的值，不触发副作用
    p.get(key).set('bar', 2)
    expect(fn).toHaveBeenCalledTimes(3)

    /**
     * 需要理解一点：当执行 effect(fn) 时，activeEffect 就是 fn
     * 此时 effect 中触发的所有 track 操作都会将 activeEffect 收集为依赖，
     * 上面代码中的依赖关系为
     * - targetMap
     *   - p
     *     - ITERATE_KEY -> fn
     *   - mapValue
     *     - foo -> fn
     *   - objValue
     *     - bar -> fn
     */
  });

  it('Map.entries', function() {
    const p = reactive(new Map([['key1', 'value1']]))
    const fn = jest.fn(() => {
      for (const [key, value] of p.entries()) {
        [key, value]
      }
    })
    // p.entries is not a function or its return value is not iterable
    effect(fn)
    expect(fn).toHaveBeenCalledTimes(1)
    p.set('key2', 'value2')
    expect(fn).toHaveBeenCalledTimes(2)
  });

  it('Map.values', function() {
    const p = reactive(new Map([['key1', 'value1']]))
    const fn = jest.fn(() => {
      for (const value of p.values()) {
        value
      }
    })
    effect(fn)
    expect(fn).toHaveBeenCalledTimes(1)
    p.set('key2', 'value2')
    expect(fn).toHaveBeenCalledTimes(2)
  });

  it('Map.keys', function() {
    const p = reactive(new Map([['key1', 'value1']]))
    const fn = jest.fn(() => {
      for (const key of p.keys()) {
        key
      }
    })

    effect(fn)
    expect(fn).toHaveBeenCalledTimes(1)
    p.set('key2', 'value2')
    expect(fn).toHaveBeenCalledTimes(2)
    // 对于 p.keys() 来说，p.set() 没有修改 key 的值，理论上来说副作用函数不应触发
    p.set('key1', 'changed')
    expect(fn).toHaveBeenCalledTimes(2)
  });
  /**
   * 1.for...in 遍历对象 和 forEach 遍历集合 之间存在本质的不同：
   *   - for...in 只关心对象的键，而不关心值，所以只有在 【新增键】或者【删除键】的时候需要触发 effect
   * 2. forEach 遍历集合的时候分情况：
   *   - Set 只关心值
   *     - add / delete => 任何影响到 Set.size 的操作
   *   - Map 既关心值也关心键
   *     - Map 的键可以是对象，所以 Map 的键值改变都应该触发 effect
   * 3.for…of 本质上是读取 [Symbol.iterator] 来进行遍历
   *   - Map.keys() / Map.values() / Map.entries() 都是在获取 [Symbol.iterator] 进行遍历的
   *     - Map.keys 当键改变时应触发副作用
   *       - key 为 引用类型 → 引用未变，但引用值变了
   *       - add/delete
   *     - Map.values 仅当值改变
   *       - value 为 引用类型 → 引用未变，但引用值变了
   *       - Map.set(oldVal, newVal) ，oldVal !== newVal
   *     - Map.entries 结合上面两个
   */
});


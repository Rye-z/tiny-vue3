import { createRenderer } from './index.js';

function shouldSetAsProps(key, el, nextValue) {
  /**
   * 特殊处理：比如 input.form 是只读的，只能用 setAttribute 函数来设置
   * 此处省略其他情况
   */
  if (key === 'form' && el.tagName === 'INPUT') return false
  return key in el
}

export const customRenderer = createRenderer({
  createElement(tag) {
    return { tag }
  },
  setElement(el, children) {
    el.text = children
  },
  insert(el, parent, anchor = null) {
    parent.children = el
  }
})

export const domRenderer = createRenderer({
  createElement(type) {
    return document.createElement(type)
  },
  setElement(el, children) {
    el.textContent = children
  },
  insert(el, container) {
    container.appendChild(el)
  },
  /**
   * @param el
   * @param key
   * @param preValue
   * @param nextValue 需要设置的值
   */
  patchProps(el, key, preValue, nextValue) {
    // 处理事件
    if (/^on/.test(key)) {
      if (preValue === nextValue) {
        return
      }

      let invokers = el._vei || (el._vei = {})
      let invoker = invokers[key]

      const name = key.slice(2).toLowerCase()

      // 如果传入了新的绑定事件
      if (nextValue) {
        // 1. 如果 invoker 不存在，则初始化 invoker，并且将 invoker 缓存到 el._vei 中
        // 2. 绑定事件名以及回调
        if (!invoker) {
          invoker = el._vei[key] = (e) => {
            // timeStamp 是事件发生的时间
            if (e.timeStamp < invoker.attached) return

            if (Array.isArray(invoker.value)) {
              invoker.value.forEach(cb => cb(e))
            } else {
              invoker.value()
            }
          }
          invoker.value = nextValue
          // performance.now() 是高精度时间，存储事件函数被绑定的时间
          invoker.attached = performance.now()
          el.addEventListener(name, invoker)
        } else {
          // 如果 invoker 已经存在，则只需要将 eventCallback 替换即可，不需要移除绑定事件
          // - 原本 addEventListener: click - eventCallback
          // - 现在 addEventListener: click - invoker.value - eventCallback
          invoker.attached = performance.now() // 这一步书里没有！！！
          invoker.value = nextValue
        }
      } else if (invoker) {
        // 新的绑定函数不存在，但是旧的函数存在，则移除事件
        el.removeEventListener(name, invoker)
      }
    } else if (key === 'class') {
      // 对 class 进行特殊处理，使用 el.className 设置是性能最高的方式
      el.className = nextValue
      /**
       * HTML Attributes 的作用是设置与之对应的 DOM Properties 的初始值
       * 判断 key 是否存在对应的 DOM Properties
       * -> div 就没有 input 的 form 属性
       */
    } else if (shouldSetAsProps(key, el, nextValue)) {
      /**
       * 获取节点类型
       * typeof button['disabled'] === 'boolean'
       * typeof button['id'] === 'string'
       */
      const type = typeof el[key]
      if (type === 'boolean' && nextValue === '') {
        // button['disabled'] = true => <button disabled></button>
        // button['disabled'] = false => <button></button>
        el[key] = true
      } else {
        el[key] = nextValue
      }
    } else {
      // 如果要设置的属性没有对应的 DOM Properties，则使用 setAttribute 函数设置属性
      el.setAttribute(key, nextValue)
    }
  },
  setText(el, text) {
    el.nodeValue = text
  },
  setComment(el, text) {
    el.nodeValue = text
  },
  createText(text) {
    return document.createTextNode(text)
  },
  createComment(text) {
    return document.createComment(text)
  }
})


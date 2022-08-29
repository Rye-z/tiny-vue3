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
    /**
     * HTML Attributes 的作用是设置与之对应的 DOM Properties 的初始值
     * 判断 key 是否存在对应的 DOM Properties
     * -> div 就没有 input 的 form 属性
     */
    if (shouldSetAsProps(key, el, nextValue)) {
      /**
       * 获取节点类型
       * typeof button['disabled'] === 'boolean'
       * typeof button['id'] === 'string'
       */
      const type = typeof el[key]
      if (type === 'boolean' && nextValue=== '') {
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
  }
})


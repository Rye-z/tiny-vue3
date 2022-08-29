import { createRenderer } from './index';

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
})


export function createRenderer(options) {
  /**
   * 渲染器的核心入口
   * @param n1 旧 vnode
   * @param n2 新 vnode
   * @param container 容器对象
   */
  const {
    createElement,
    insert,
    setElement
  } = options
  function patch(n1, n2, container) {
    if(!n1) {
      mountElement(n2, container)
    } else {
      // n1 存在，意味着打补丁
    }
  }

  function shouldSetAsProps(key, el) {
    /**
     * 特殊处理：比如 input.form 是只读的，只能用 setAttribute 函数来设置
     * 此处省略其他情况
     */
    if (key === 'form' && el.tagName === 'INPUT') return false
    return key in el
  }
  /**
   * 使用 type 类型来描述一个 vnode 的类型，不同类型的 type 属性可以描述多种类型的 type
   * - 当 type 是字符串类型时，可以认为它描述的是普通标签，并使用该 type 属性的字符串作为标签的名称
   * @@example: vnode.type {
   *   type: 'h1',
   *   children: 'hello'
   * }
   */
  function mountElement(vnode, container) {
    // 创建 DOM 元素
    const el = createElement(vnode.type)
    // 处理子节点，如果子节点是字符串，代表元素具有文本节点
    if (typeof vnode.children === 'string') {
      setElement(el, vnode.children)
    } else if (Array.isArray(vnode.children)) {
      vnode.children.forEach((child) => {
        // 因为是对子 vnode 的处理，所以挂载点为创建的 el
        // 因为是挂载阶段，所以第一个参数是 null
        patch(null, child, el)
      })
    }
    // 处理 props
    if (vnode.props) {
      for (const key in vnode.props) {
        const value = vnode.props[key]
        /**
         * HTML Attributes 的作用是设置与之对应的 DOM Properties 的初始值
         * 判断 key 是否存在对应的 DOM Properties
         * -> div 就没有 input 的 form 属性
         */
        if (shouldSetAsProps(key, el)) {
          /**
           * 获取节点类型
           * typeof button['disabled'] === 'boolean'
           * typeof button['id'] === 'string'
           */
          const type = typeof el[key]
          if (type === 'boolean' && value === '') {
            // button['disabled'] = true => <button disabled></button>
            // button['disabled'] = false => <button></button>
            el[key] = true
          } else {
            el[key] = value
          }
        } else {
          // 如果要设置的属性没有对应的 DOM Properties，则使用 setAttribute 函数设置属性
          el.setAttribute(key, vnode.props[key])
        }
      }
    }

    // 将元素添加到容器内
    insert(el, container)
  }

  function render(vnode, container) {
    if (vnode) {
      // 新 vnode 存在，将其与旧 vnode 一起传给 patch 函数，进行打补丁
      patch(container._vnode, vnode, container)
    } else {
      if (container._vnode) {
        // 旧 vnode 存在，而新 vnode 不存在，说明是卸载（unmount）操作
        // 暂时这么实现
        container.innerHTML = ''
      }
    }
    // 存储新 _vnode
    container._vnode = vnode
  }
  // 服务端渲染相关
  function hydrate() {}

  // 因为 renderer 有很多功能，render 只是其中一种，所以返回值是一个有各种功能的对象
  return {
    render
  }
}

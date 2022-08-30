export const TEXT = Symbol()

export function createRenderer(options) {
  const {
    createElement,
    insert,
    setElement,
    patchProps,
    createText,
    setText
  } = options

  /**
   * @param n1 旧节点
   * @param n2 新节点
   * @param container 父节点
   */
  function patchChildren(n1, n2, container) {
    // a. 新节点为文本元素
    if (typeof n2.children === 'string') {
      // 旧子节点的类型有三种可能：没有子节点、文本子节点以及一组子节点
      // 只有当旧子节点为一组子节点时，才需要逐个卸载，其他情况下什么都不需要做
      if (Array.isArray(n1.children)) {
        n1.children.forEach(c => unmount(c))
      }
      setElement(container, n2.children)
    }
    // b. 新子节点为数组
    else if(Array.isArray(n2.children)) {
      // 判断旧节点是否也是一组数组
      if (Array.isArray(n1.children)) {
        // todo diff 算法
        n1.children.forEach(c => unmount(c))
        n1.children.forEach(c => patch(null, c, container))
      } else {
        // 此时，旧节点要么是 1. 文本节点，2.null
        // 只需要将旧节点清空，然后再逐个挂载
        setElement(container, '')
        n1.children.forEach(c => patch(null, c, container))
      }
    }
    // c. 新子节点不存在
    else {
      if (Array.isArray(n1.children)) {
        n1.children.forEach(c => unmount(c))
      } else if (typeof n1.children === 'string') {
        setElement(container, '')
      }
    }
  }

  /**
   * @param n1 旧节点
   * @param n2 新节点
   */
  function patchElement(n1, n2) {
    const el = n2.el = n1.el
    const oldProps = n1.props
    const newProps = n2.props

    // 更新 props
    for (const key in newProps) {
      if (newProps[key] !== oldProps[key]) {
        patchProps(el, key, oldProps[key], newProps[key])
      }
    }
    for (const key in oldProps) {
      if(!(key in newProps)) {
        patchProps(el, key, oldProps[key], null)
      }
    }
    // 更新 children
    patchChildren(n1, n2, el)
  }

  /**
   * "打补丁"
   * @param n1 旧节点
   * @param n2 新节点
   * @param container
   */
  function patch(n1, n2, container) {
    // 不同 type 的元素之间，可能属性是不同的，所以不存在打补丁的意义
    if(n1 && n1.type !== n2.type) {
      unmount(n1)
      // 将 n1 设为 null，保证后续挂载操作正确执行
      n1 = null
    }

    const {type} = n2

    if (typeof type === 'string') {
      // 如果没有旧节点，说明还没有挂载 => 执行挂载操作
      if (!n1) {
        mountElement(n2, container)
      } else {
        // 旧节点存在，执行 “打补丁” 操作
        patchElement(n1, n2)
      }
    }
    else if (type === TEXT) {
      if (!n1) {
        const el = n2.el = createText(n2.children)
        insert(el, container)
      } else {
        // n1 存在，替换节点内容
        const el = n1.el = n2.el
        if (n2.children !== n1.children) {
          setText(el, n2.children)
        }
      }
    }
    else if (type === 'object') {
      // vnode 类型为 object，表示描述的是组件
    }
    else if( type === '') {
      // 其他
    }
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
    // 将 vnode 和 真实 DOM 建立关联，方便在卸载操作时使用
    const el = vnode.el = createElement(vnode.type)
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
        patchProps(el, key, null, vnode.props[key])
      }
    }

    // 将元素添加到容器内
    insert(el, container)
  }

  function unmount(vnode) {
    // 旧 vnode 存在，而新 vnode 不存在，说明是卸载（unmount）操作
    // 获取真实 DOM 元素
    const el = vnode.el
    const parent = el.parentNode // Web API
    if (parent) parent.removeChild(el) // WebAPI
  }

  function render(vnode, container) {
    if (vnode) {
      // 新 vnode 存在，将其与旧 vnode 一起传给 patch 函数，进行打补丁
      patch(container._vnode, vnode, container)
    } else {
      if (container._vnode) {
        unmount(container._vnode)
      }
    }
    // 存储新 _vnode
    container._vnode = vnode
  }

  // 服务端渲染相关
  function hydrate() {}

  // 因为 renderer 有很多功能，render 只是其中一种，所以返回值是一个有各种功能的对象
  return {
    render,
  }
}

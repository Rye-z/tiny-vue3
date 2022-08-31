export const TEXT = Symbol()
export const COMMENT = Symbol()
export const Fragment = Symbol()

export function createRenderer(options) {
  const {
    createElement,
    insert,
    setElement,
    patchProps,
    createText,
    createComment,
    setText,
    setComment
  } = options

  /**
   * 简单 Diff 算法
   * @param n1
   * @param n2
   * @param container
   */
  function simpleDiff(n1, n2, container) {
    const oldChildren = n1.children
    const newChildren = n2.children

    // 首先 key 肯定是唯一的
    const keysToRemove = new Map()
    oldChildren.forEach(c => keysToRemove.set(c.key, c))
    // 遍历新节点
    let lastIndex = 0
    for (let i = 0; i < newChildren.length; i++) {
      let find = false
      const newVNode = newChildren[i]
      // 从旧节点中查找是否有具有相同 key 的节点
      for (let j = 0; j < oldChildren.length; j++) {
        const oldVNode = oldChildren[j]
        // 说明是具有相同 DOM 元素的节点
        if (oldVNode.key === newVNode.key) {
          find = true
          keysToRemove.delete(oldVNode.key)
          // 元素可能是标签相同，但是内容已经改变，所以需要进行 patch 操作
          patch(oldVNode, newVNode, container)

          if (j < lastIndex) {
            // 说明真实的 DOM 元素需要移动
            // 先获取上一个节点，因为上一个节点可能修改了 lastIndex，所以需要移动到上一个节点后面
            const preVNode = newChildren[i - 1]
            // 如果没有上个节点，说明是第一个节点
            if (preVNode) {
              // 获取新节点的下一个节点兄弟节点作为锚点
              // newNode.el 和 oldNode.el 是相同的
              const anchor = preVNode.el.nextSibling
              insert(oldVNode.el, container, anchor)
            }
          } else {
            lastIndex = j
          }
          break
        }
      }

      // 说明子节点是新增的
      if (!find) {
        const preVNode = newChildren[i - 1]
        let anchor = null
        if (preVNode) {
          anchor = preVNode.el.nextSibling
        } else {
          // 如果没有 preVNode，则用当前父节点的第一个元素作为锚点
          anchor = container.firstChild
        }
        patch(null, newVNode, container, anchor)
      }
    }
    // 删除遗留属性
    keysToRemove.forEach((vnode, key) => {
      unmount(vnode)
    })
  }

  /**
   * 双端 Diff 算法
   */
  function doubleEndDiff(n1, n2, container) {
    const oldChildren = n1.children
    const newChildren = n2.children

    let oldStartIdx = 0
    let oldEndIdx = n1.children.length - 1
    let newStartIdx = 0
    let newEndIdx = n2.children.length - 1

    let oldStartVNode = oldChildren[oldStartIdx]
    let newStartVNode = newChildren[newStartIdx]
    let oldEndVNode = oldChildren[oldEndIdx]
    let newEndVNode = newChildren[newEndIdx]

    while (newStartIdx <= newEndIdx && oldStartIdx <= oldEndIdx) {
      // 处理非理想情况时，一定会出现 oldChildren 中出现 null 的情况
      // 当遍历再次进行的时候，oldEndVNode 和 newEndVNode 都可能出现 null 的情况
      // 直接移动到下一步
      if (!oldStartVNode) {
        oldStartVNode = oldChildren[++oldStartIdx]
      }
      else if(!oldEndVNode) {
        oldEndVNode = oldChildren[--oldEndIdx]
      }
      else if (newStartVNode.key === oldStartVNode.key) {
        patch(oldStartVNode, newStartVNode, container)
        oldStartVNode = oldChildren[++oldStartIdx]
        newStartVNode = newChildren[++newStartIdx]
      } else if (newEndVNode.key === oldEndVNode.key) {
        patch(oldEndVNode, newEndVNode, container)
        oldEndVNode = oldChildren[--oldEndIdx]
        newEndVNode = newChildren[--newEndIdx]
      } else if (newEndVNode.key === oldStartVNode.key) {
        patch(oldStartVNode, newEndVNode, container)
        // insertBefore(el, container, anchor) 如果 anchor 为 null/undefined，则插入最后
        insert(oldStartVNode.el, container, oldEndVNode.el.nextSibling)
        newEndVNode = newChildren[--newEndIdx]
        oldStartVNode = oldChildren[++oldStartIdx]
      } else if (newStartVNode.key === oldEndVNode.key) {
        // 需要移动 DOM
        patch(oldEndVNode, newStartVNode, container)
        insert(oldEndVNode.el, container, oldStartVNode.el)
        oldEndVNode = oldChildren[--oldEndIdx]
        newStartVNode = newChildren[++newStartIdx]
      }
      // 非理想情况下的逻辑
      else {
        const idxInOld = oldChildren.findIndex(v => v.key === newStartVNode.key)

        // 如果找到了
        if (idxInOld > 0) {
          const nodeToMove = oldChildren[idxInOld]
          patch(nodeToMove, newStartVNode, container)
          insert(nodeToMove.el, container, oldStartVNode.el)
          // 因为在 idxInOld 中，真实 dom 已经被移动过了，但是 oldChildren 顺序没有改变，所以将其置为 null
          oldChildren[idxInOld] = null
          newStartVNode = newChildren[++newStartIdx]
        }
      }
    }
  }

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
    else if (Array.isArray(n2.children)) {
      // 判断旧节点是否也是一组数组
      if (Array.isArray(n1.children)) {
        // ================ Start: Diff 算法 ================
        // simpleDiff(n1, n2, container)
        doubleEndDiff(n1, n2, container)
        // ================ End: Diff 算法 ================
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
   * patchElement 是对于具有相同 key 的 vnode 节点进行 打补丁操作
   * @param n1 旧节点
   * @param n2 新节点
   */
  function patchElement(n1, n2) {
    // 这一步其实就是具有相同 key 的 vnode 节点的真实节点复用，不需要再次调用 createElement 创建节点
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
      if (!(key in newProps)) {
        patchProps(el, key, oldProps[key], null)
      }
    }
    // 更新 children
    patchChildren(n1, n2, el)
  }

  /**
   * "打补丁"
   * - n1 不存在 => 挂载节点
   * - n1 存在 => 更新节点
   * @param n1 旧节点
   * @param n2 新节点
   * @param container
   */
  function patch(n1, n2, container, anchor) {
    // 不同 type 的元素之间，可能属性是不同的，所以不存在打补丁的意义
    if (n1 && n1.type !== n2.type) {
      unmount(n1)
      // 将 n1 设为 null，保证后续挂载操作正确执行
      n1 = null
    }

    const { type } = n2

    // ================ 处理普通标签节点 ================
    if (typeof type === 'string') {
      // 如果没有旧节点，说明还没有挂载 => 执行挂载操作
      if (!n1) {
        mountElement(n2, container, anchor)
      } else {
        // 旧节点存在，执行 “打补丁” 操作
        patchElement(n1, n2)
      }
    }
    // ================ 处理文本节点 ================
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
    // ================ 处理注释节点 ================
    else if (type === COMMENT) {
      if (!n1) {
        const el = n2.el = createComment(n2.children)
        insert(el, container)
      } else {
        const el = n1.el = n2.el
        if (n2.children !== n1.children) {
          setComment(el, n2.children)
        }
      }
    }
    // ================ Fragment ================
    else if (type === Fragment) {
      if (!n1) {
        // Fragment 用来处理多根节点，所以没有父节点，所以不能用 mountElement
        n2.children.forEach(c => patch(null, c, container))
      } else {
        // 如果旧节点存在，则只需要更新 Fragment 的 children 即可
        patchChildren(n1, n2, container)
      }
    }
    // ================ 处理组件 ================
    else if (type === 'object') {
      // vnode 类型为 object，表示描述的是组件
    } else if (type === '') {
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
  function mountElement(vnode, container, anchor) {
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
    insert(el, container, anchor)
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
    render
  }
}

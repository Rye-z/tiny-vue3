import { getSequence } from '../utils.js';

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
    keysToRemove.forEach((vnode, _) => {
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
      } else if (!oldEndVNode) {
        oldEndVNode = oldChildren[--oldEndIdx]
      } else if (newStartVNode.key === oldStartVNode.key) {
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
        // 如果在循环过程中，上面的步骤中，每一步都有命中，被消消乐了，那么可能会有残留
        const idxInOld = oldChildren.findIndex(v => v && (v.key === newStartVNode.key))

        // 如果找到了
        if (idxInOld > 0) {
          const nodeToMove = oldChildren[idxInOld]
          patch(nodeToMove, newStartVNode, container)
          insert(nodeToMove.el, container, oldStartVNode.el)
          // 因为在 idxInOld 中，真实 dom 已经被移动过了，但是 oldChildren 顺序没有改变，所以将其置为 null
          oldChildren[idxInOld] = null
        } else {
          // 如果没找到，将节点挂载到 oldStartVnode 前
          patch(null, newStartVNode, container, oldStartVNode.el)
        }
        newStartVNode = newChildren[++newStartIdx]
      }
    }
    // 检查漏网之鱼
    if (oldEndIdx < oldStartIdx && newStartIdx <= newEndIdx) {
      // 有新节点遗留，遍历 newStartIdx 和 newEndIdx 之间的节点
      for (let i = newStartIdx; i <= newEndIdx; i++) {
        patch(null, newChildren[i], container, oldStartVNode.el)
      }
    } else if (newEndIdx < newStartIdx && oldStartIdx <= oldEndIdx) {
      // 有旧节点遗留，卸载
      for (let i = oldStartIdx; i <= oldEndIdx; i++) {
        // 可能为空
        oldChildren[i] && unmount(oldChildren[i])
      }
    }
  }

  function quickDiff(n1, n2, container) {
    const oldChildren = n1.children
    const newChildren = n2.children
    // a. 预处理
    // a.1 更新相同的前置节点
    // 新节点和旧节点起始索引值相同
    let start = 0
    let newVNode = newChildren[start]
    let oldVNode = oldChildren[start]

    while (newVNode.key === oldVNode.key) {
      patch(oldVNode, newVNode, container)
      start++
      newVNode = newChildren[start]
      oldVNode = oldChildren[start]
    }

    // a.2 更新相同的后置节点
    // 新节点和旧节点结束索引值相同
    let oldEnd = n1.children.length - 1
    let newEnd = n2.children.length - 1
    newVNode = newChildren[newEnd]
    oldVNode = oldChildren[oldEnd]

    while (newVNode.key === oldVNode.key) {
      patch(oldVNode, newVNode, container)
      newVNode = newChildren[--newEnd]
      oldVNode = oldChildren[--oldEnd]
      if (!oldVNode || !newVNode) break
    }

    // a.3.1 理想状态下，新节点序列未遍历完 -> 创建节点
    if (start > oldEnd && start <= newEnd) {
      const anchor = newChildren[newEnd + 1] ? newChildren[newEnd + 1].el : null
      while (start <= newEnd) {
        patch(null, newChildren[start++], container, anchor)
      }
    }
    // a.3.2 理想状态下，旧节点序列未遍历完 -> 删除多余节点
    else if (start > newEnd && start <= oldEnd) {
      while (start <= oldEnd) {
        unmount(oldChildren[start++])
      }
    }
    // b 处理非理想状态
    else {

      // 这里的 newStart 和 oldStart 是处理之后的索引，可能不是 0 了
      let newStart = start
      let oldStart = start

      // 优化双重遍历
      // - 存储新序列的 key 和 新序列的索引值
      //    => 这样在遍历旧序列的时候，就可以直接通过 key-value 获取新节点的索引值，而不用遍历
      // - 这里要注意
      const keyIndex = {}
      for (let i = newStart; i <= newEnd; i++) {
        keyIndex[newChildren[i].key] = i
      }

      // 1. 构建 source 数组 -> 用于构建最大递增子序列
      // - 长度等于“预处理”之后的新节点序列长度
      // - 存储和新节点具有相同 key 值的旧节点的索引值
      // - source 的每个元素有两层含义
      //    - 1. 每个元素索引和新序列元素索引 一一对应
      //    - 2. 假设 index 为 1，且 `source[index] !== -1` => `newChildren[index].key = oldChildren[source[index]].key`
      // 2. 判断是否有节点需要移动
      // - 注意：这里只需要判断，不需要移动元素，移动元素在下一环节
      const count = newEnd - newStart + 1
      let source = new Array(count)
      source.fill(-1)

      // 判断是否有多余节点需要卸载
      let patched = 0

      // 判断是否有节点需要移动
      let moved = false
      let pos = 0

      for (let i = oldStart; i <= oldEnd; i++) {
        oldVNode = oldChildren[i]
        // 更新过的节点数小于可能需要更新的节点数，继续执行更新
        if (patched <= count) {
          const newIdx = keyIndex[oldVNode.key]
          // 这里因为 index 可能是 0，所以需要判断
          if (typeof newIdx !== 'undefined') {
            const newVNode = newChildren[newIdx]
            patch(oldVNode, newVNode, container)
            source[newIdx - newStart] = i
            patched++

            // 这里判断方式和 “简单 Diff 算法类似”
            if (newIdx < pos) {
              moved = true
            } else {
              pos = newIdx
            }
          } else {
            // 说明是多余节点，删除
            unmount(oldVNode)
          }
        } else {
          // 更新的节点数大于需要更新的节点数，说明这是多余节点，执行卸载
          unmount(oldVNode)
        }
      }

      // 移动元素
      if (moved) {
        // 获取最大增长子序列，返回的是 index
        // seq 中的值都是不需要移动的值
        const seq = getSequence(source)
        // 指向 seq 最后一个元素
        let n = seq.length - 1
        // 指向新序列最后一个元素
        let m = count - 1

        // 这一步可以理解为对 source 的遍历，因为 source 和 新序列是等长的
        for (let i = m; i >= 0; i--) {
          // 需要创建节点
          if (source[i] === -1) {
            // 该节点在 newChildren 中的真实位置索引
            const pos = i + newStart
            const newVnode = newChildren[pos]
            const anchor = newChildren[pos + 1] ? newChildren[pos + 1].el : null
            patch(null, newVnode, container, anchor)
          }
          // 这一步其实是在比较新序列索引和旧序列索引是否相同，相同，说明不需要移动
          else if (m !== seq[n]) {
            // 说明节点需要移动
            const pos = i + newStart
            const newVnode = newChildren[pos]
            const anchor = newChildren[pos + 1] ? newChildren[pos + 1].el : null
            insert(newVnode.el, container, anchor)
          } else {
            // 这里说明索引值，一样，也就是顺序不需要变化
            n--
          }
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
        // doubleEndDiff(n1, n2, container)
        quickDiff(n1, n2, container)
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
   * @param anchor
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
  // function hydrate() {}

  // 因为 renderer 有很多功能，render 只是其中一种，所以返回值是一个有各种功能的对象
  return {
    render
  }
}

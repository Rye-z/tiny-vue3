export function createRenderer() {
  /**
   * 渲染器的核心入口
   * @param n1 旧 vnode
   * @param n2 新 vnode
   * @param container 容器对象
   */
  function patch(n1, n2, container) {
    if(!n1) {
      mountElement(n2, container)
    } else {
      // n1 存在，意味着打补丁
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
    const el = document.createElement(vnode.type)
    // 处理子节点，如果子节点是字符串，代表元素具有文本节点
    if (typeof vnode.children === 'string') {
      el.textContent = vnode.children
    }
    // 将元素添加到容器内
    container.appendChild(el)
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

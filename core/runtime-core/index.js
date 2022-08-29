export function createRenderer() {
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

export function patch(n1, n2, container) {
}

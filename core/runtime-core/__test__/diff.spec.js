import { domRenderer } from '../renderers';

describe('简单 diff', function() {
  it('', function() {
    const root = document.createElement('div')

    const vnode1 = {
      type: 'div',
      children: [
        { type: 'p', children: '1', key: 1 },
        { type: 'p', children: '2', key: 2 },
        { type: 'p', children: '3', key: 3 }
      ]
    }
    const vnode2 = {
      type: 'div',
      children: [
        { type: 'p', children: '3-3', key: 3 },
        { type: 'p', children: '1-1', key: 1 },
        { type: 'p', children: '2-2', key: 2 }
      ]
    }

    domRenderer.render(vnode1, root)
    expect(root.innerHTML).toBe('<div><p>1</p><p>2</p><p>3</p></div>')
    domRenderer.render(vnode2, root)
    expect(root.innerHTML).toBe('<div><p>3-3</p><p>1-1</p><p>2-2</p></div>')
  });

  it('添加新元素', function() {
    const root = document.createElement('div')

    const vnode1 = {
      type: 'div',
      children: [
        { type: 'p', children: '1', key: 1 },
        { type: 'p', children: '2', key: 2 },
        { type: 'p', children: '3', key: 3 }
      ]
    }
    const vnode2 = {
      type: 'div',
      children: [
        { type: 'p', children: '3-3', key: 3 },
        { type: 'p', children: '4-4', key: 4 },
        { type: 'p', children: '1-1', key: 1 },
        { type: 'p', children: '2-2', key: 2 }
      ]
    }

    domRenderer.render(vnode1, root)
    expect(root.innerHTML).toBe('<div><p>1</p><p>2</p><p>3</p></div>')
    domRenderer.render(vnode2, root)
    expect(root.innerHTML).toBe('<div><p>3-3</p><p>4-4</p><p>1-1</p><p>2-2</p></div>')
  });

  it('删除遗留元素', function() {
    const root = document.createElement('div')

    const vnode1 = {
      type: 'div',
      children: [
        { type: 'p', children: '1', key: 1 },
        { type: 'p', children: '2', key: 2 },
        { type: 'p', children: '3', key: 3 },
        { type: 'p', children: '4', key: 4 }
      ]
    }
    const vnode2 = {
      type: 'div',
      children: [
        { type: 'p', children: '3-3', key: 3 },
        { type: 'p', children: '1-1', key: 1 }
      ]
    }

    domRenderer.render(vnode1, root)
    expect(root.innerHTML).toBe('<div><p>1</p><p>2</p><p>3</p><p>4</p></div>')
    domRenderer.render(vnode2, root)
    expect(root.innerHTML).toBe('<div><p>3-3</p><p>1-1</p></div>')
  });

  it('综合', function() {
    const root = document.createElement('div')

    const vnode1 = {
      type: 'div',
      children: [
        { type: 'p', children: '1', key: 1 },
        { type: 'p', children: '2', key: 2 },
        { type: 'p', children: '3', key: 3 },
        { type: 'p', children: '4', key: 4 }
      ]
    }
    const vnode2 = {
      type: 'div',
      children: [
        { type: 'p', children: '3-3', key: 3 },
        { type: 'p', children: '1-1', key: 1 },
        { type: 'p', children: '5-5', key: 5 }
      ]
    }

    domRenderer.render(vnode1, root)
    expect(root.innerHTML).toBe('<div><p>1</p><p>2</p><p>3</p><p>4</p></div>')
    domRenderer.render(vnode2, root)
    expect(root.innerHTML).toBe('<div><p>3-3</p><p>1-1</p><p>5-5</p></div>')
  });
});

describe('双端 diff 算法', function() {
  it('10.1 基础实现', function() {
    const root = document.createElement('div')

    const vnode1 = {
      type: 'div',
      children: [
        { type: 'p', children: '1', key: 1 },
        { type: 'p', children: '2', key: 2 },
        { type: 'p', children: '3', key: 3 },
        { type: 'p', children: '4', key: 4 }
      ]
    }
    const vnode2 = {
      type: 'div',
      children: [
        { type: 'p', children: '4-4', key: 4 },
        { type: 'p', children: '2-2', key: 2 },
        { type: 'p', children: '1-1', key: 1 },
        { type: 'p', children: '3-3', key: 3 }
      ]
    }

    domRenderer.render(vnode1, root)
    expect(root.innerHTML).toBe('<div><p>1</p><p>2</p><p>3</p><p>4</p></div>')
    domRenderer.render(vnode2, root)
    expect(root.innerHTML).toBe('<div><p>4-4</p><p>2-2</p><p>1-1</p><p>3-3</p></div>')
  });

  it('10.3 非理想情况的实现', function() {
    const root = document.createElement('div')

    const vnode1 = {
      type: 'div',
      children: [
        { type: 'p', children: '1', key: 1 },
        { type: 'p', children: '2', key: 2 },
        { type: 'p', children: '3', key: 3 },
        { type: 'p', children: '4', key: 4 }
      ]
    }
    const vnode2 = {
      type: 'div',
      children: [
        { type: 'p', children: '2-2', key: 2 },
        { type: 'p', children: '4-4', key: 4 },
        { type: 'p', children: '1-1', key: 1 },
        { type: 'p', children: '3-3', key: 3 }
      ]
    }

    domRenderer.render(vnode1, root)
    expect(root.innerHTML).toBe('<div><p>1</p><p>2</p><p>3</p><p>4</p></div>')
    domRenderer.render(vnode2, root)
    expect(root.innerHTML).toBe('<div><p>2-2</p><p>4-4</p><p>1-1</p><p>3-3</p></div>')
  });

  it('添加新元素 01', function() {
    const root = document.createElement('div')

    const vnode1 = {
      type: 'div',
      children: [
        { type: 'p', children: '1', key: 1 },
        { type: 'p', children: '2', key: 2 },
        { type: 'p', children: '3', key: 3 }
      ]
    }
    const vnode2 = {
      type: 'div',
      children: [
        { type: 'p', children: '4-4', key: 4 },
        { type: 'p', children: '3-3', key: 3 },
        { type: 'p', children: '1-1', key: 1 },
        { type: 'p', children: '2-2', key: 2 }
      ]
    }

    domRenderer.render(vnode1, root)
    expect(root.innerHTML).toBe('<div><p>1</p><p>2</p><p>3</p></div>')
    domRenderer.render(vnode2, root)
    expect(root.innerHTML).toBe('<div><p>4-4</p><p>3-3</p><p>1-1</p><p>2-2</p></div>')
  });

  it('添加新元素 02', function() {
    const root = document.createElement('div')

    const vnode1 = {
      type: 'div',
      children: [
        { type: 'p', children: '1', key: 1 },
        { type: 'p', children: '2', key: 2 },
        { type: 'p', children: '3', key: 3 }
      ]
    }
    const vnode2 = {
      type: 'div',
      children: [
        { type: 'p', children: '4-4', key: 4 },
        { type: 'p', children: '1-1', key: 1 },
        { type: 'p', children: '2-2', key: 2 },
        { type: 'p', children: '3-3', key: 3 }
      ]
    }

    domRenderer.render(vnode1, root)
    expect(root.innerHTML).toBe('<div><p>1</p><p>2</p><p>3</p></div>')
    domRenderer.render(vnode2, root)
    expect(root.innerHTML).toBe('<div><p>4-4</p><p>1-1</p><p>2-2</p><p>3-3</p></div>')
  });

  it('移除元素', function() {
    const root = document.createElement('div')

    const vnode1 = {
      type: 'div',
      children: [
        { type: 'p', children: '1', key: 1 },
        { type: 'p', children: '2', key: 2 },
        { type: 'p', children: '3', key: 3 },
        { type: 'p', children: '4', key: 4 },
        { type: 'p', children: '5', key: 5 },
      ]
    }
    const vnode2 = {
      type: 'div',
      children: [
        { type: 'p', children: '3-3', key: 3 },
        { type: 'p', children: '5-5', key: 5 },
        { type: 'p', children: '1-1', key: 1 },
      ]
    }

    domRenderer.render(vnode1, root)
    expect(root.innerHTML).toBe('<div><p>1</p><p>2</p><p>3</p><p>4</p><p>5</p></div>')
    domRenderer.render(vnode2, root)
    expect(root.innerHTML).toBe('<div><p>3-3</p><p>5-5</p><p>1-1</p></div>')
  });

  it('综合', function() {
    const root = document.createElement('div')

    const vnode1 = {
      type: 'div',
      children: [
        { type: 'p', children: '1', key: 1 },
        { type: 'p', children: '2', key: 2 },
        { type: 'p', children: '3', key: 3 },
        { type: 'p', children: '4', key: 4 },
        { type: 'p', children: '5', key: 5 },
      ]
    }
    const vnode2 = {
      type: 'div',
      children: [
        { type: 'p', children: '3-3', key: 3 },
        { type: 'p', children: '5-5', key: 5 },
        { type: 'p', children: '1-1', key: 1 },
        { type: 'p', children: '6-6', key: 6 },
      ]
    }

    domRenderer.render(vnode1, root)
    expect(root.innerHTML).toBe('<div><p>1</p><p>2</p><p>3</p><p>4</p><p>5</p></div>')
    domRenderer.render(vnode2, root)
    expect(root.innerHTML).toBe('<div><p>3-3</p><p>5-5</p><p>1-1</p><p>6-6</p></div>')
  });
});

describe('快速 Diff 算法', function() {
  it('预处理 理想状态 01', function() {
    const root = document.createElement('div')

    const vnode1 = {
      type: 'div',
      children: [
        { type: 'p', children: '1', key: 1 },
        { type: 'p', children: '2', key: 2 },
        { type: 'p', children: '3', key: 3 },
      ]

    }
    const vnode2 = {
      type: 'div',
      children: [
        { type: 'p', children: '1-1', key: 1 },
        { type: 'p', children: '3-3', key: 3 },
      ]
    }

    domRenderer.render(vnode1, root)
    expect(root.innerHTML).toBe('<div><p>1</p><p>2</p><p>3</p></div>')
    domRenderer.render(vnode2, root)
    expect(root.innerHTML).toBe('<div><p>1-1</p><p>3-3</p></div>')
  });

  it('预处理 理想状态 02', function() {
    const root = document.createElement('div')

    const vnode1 = {
      type: 'div',
      children: [
        { type: 'p', children: '1', key: 1 },
        { type: 'p', children: '3', key: 3 },
      ]

    }
    const vnode2 = {
      type: 'div',
      children: [
        { type: 'p', children: '1-1', key: 1 },
        { type: 'p', children: '2-2', key: 2 },
        { type: 'p', children: '3-3', key: 3 },
      ]
    }

    domRenderer.render(vnode1, root)
    expect(root.innerHTML).toBe('<div><p>1</p><p>3</p></div>')
    domRenderer.render(vnode2, root)
    expect(root.innerHTML).toBe('<div><p>1-1</p><p>2-2</p><p>3-3</p></div>')
  });

  it('非理想状态处理', function() {

  });
});

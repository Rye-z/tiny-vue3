import { domRenderer } from '../renderers';

describe('diff', function() {
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
        { type: 'p', children: '1-1', key: 1 },
      ]
    }

    domRenderer.render(vnode1, root)
    expect(root.innerHTML).toBe('<div><p>1</p><p>2</p><p>3</p><p>4</p></div>')
    domRenderer.render(vnode2, root)
    expect(root.innerHTML).toBe('<div><p>3-3</p><p>1-1</p></div>')
  });
});

import {
  customRenderer,
  domRenderer
} from '../renderers';

describe('renderer', function() {
  it('customRenderer', function() {
    const root = { type: 'root'}

    const vnode = {
      type: 'h1',
      children: 'hello world'
    }
    customRenderer.render(vnode, root)
    console.log(JSON.stringify(root))
  });

  it('domRenderer', function() {
    const root = document.createElement('div')
    const vnode = {
      type: 'h1',
      children: 'hello world'
    }
    domRenderer.render(vnode, root)

    expect(root.innerHTML).toBe('<h1>hello world</h1>')
  });

  it('should render nested vnode', function() {
    const root = document.createElement('div')
    const vnode = {
      type: 'h1',
      children: [
        {
          type: 'p',
          children: 'hello'
        }
      ]
    }
    domRenderer.render(vnode, root)

    expect(root.innerHTML).toBe('<h1><p>hello</p></h1>')
  });

  it('should render props', function() {
    const root = document.createElement('div')
    const vnode = {
      type: 'div',
      props: {
        id: 'foo'
      },
      children: [
        {
          type: 'p',
          children: 'hello'
        }
      ]
    }
    domRenderer.render(vnode, root)

    expect(root.innerHTML).toBe('<div id="foo"><p>hello</p></div>')
  });

  it('button disabled should be set correctly', function() {
    const root = document.createElement('div')
    const button = {
      type: 'button',
      props: {
        disabled: false
      }
    }

    domRenderer.render(vnode, root)
  });
});

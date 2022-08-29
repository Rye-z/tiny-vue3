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
    /**
     * const a = document.createElement('button')
     * a['disabled'] = true
     * >> a
     * >> <button disabled></button>
     *
     * a['disabled'] = false
     * >> a
     * >> <button></button>
     *
     * typeof a['disabled']
     * >> 'boolean'
     */
    const root1 = document.createElement('div')
    const root2 = document.createElement('div')
    const root3 = document.createElement('div')
    const button1 = {
      type: 'button',
      props: {
        disabled: false
      }
    }
    domRenderer.render(button1, root1)
    expect(root1.innerHTML).toBe('<button></button>')

    const button2 = {
      type: 'button',
      props: {
        disabled: true
      }
    }
    domRenderer.render(button2, root2)
    // 可能是因为使用 jsdom 测试环境，button 渲染结果有点异常，但是浏览器环境下是正常的，见 render_button_disabled.html
    expect(root2.innerHTML).toBe('<button disabled=\"\"></button>')

    const button3 = {
      type: 'button',
      props: {
        disabled: ''
      }
    }
    domRenderer.render(button3, root3)
    expect(root3.innerHTML).toBe('<button disabled=\"\"></button>')
  });
});

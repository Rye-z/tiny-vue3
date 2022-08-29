import { createRenderer } from '../index';
import { serializeInner } from '../serialize';

const renderer = createRenderer()
const root = document.createElement('div')

const inner = (c) => serializeInner(c)

describe('renderer', function() {
  // todo 暂时不能运行，可能是 vnode 返回格式不对
  it('renderer', function() {
    const vnode = {
      type: 'h1',
      children: 'hello world'
    }
    renderer.render(vnode, root)
    expect(inner(root).tobe('<h1>hello world</h1>>'))
  });
});

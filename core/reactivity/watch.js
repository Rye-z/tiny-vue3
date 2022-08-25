import { effect } from './effect';

export function watch(source, cb) {
  effect(() => source.foo, {
    scheduler() {
      cb()
    }
  })
}

import { effect } from './effect';

export function computed(getter) {
  const runner = effect(getter, {
    lazy: true
  })

  return {
    get value() {
      return runner()
    }
  }
}

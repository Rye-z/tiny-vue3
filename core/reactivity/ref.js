import { reactive } from './reactive';
import {
  track,
  trigger
} from './effect';

export function ref(value) {
  const wrapper = reactive({ value })

  return {
    get value() {
      return wrapper.value
    },
    set value(val) {
      wrapper.value = val
    }
  }

}

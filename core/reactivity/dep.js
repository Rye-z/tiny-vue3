import { trackOpBit } from './effect.js';

export const createDep = () => {
  const dep = new Set()
  dep.w = 0
  dep.n = 0
  return dep
}

export const wasTracked = dep => (dep.w & trackOpBit) > 0

export const newTracked = dep => (dep.n & trackOpBit) > 0

export const initDepMarkers = (deps) => {
  if (deps.length) {
    for (let i = 0; i < deps.length; i++) {
      deps[i].w |= trackOpBit // set was tracked
    }
  }
}

export const finalizeDepMarkers = (effect) => {
  const { deps } = effect
  if (deps.length) {
    let ptr = 0
    for (let i = 0; i < deps.length; i++) {
      const dep = deps[i]
      if (wasTracked(dep) && !newTracked(dep)) {
        dep.delete(effect)
      } else {
        deps[ptr++] = dep
      }
      // clear bits
      dep.w &= ~trackOpBit
      dep.n &= ~trackOpBit
    }
    deps.length = ptr
  }
}

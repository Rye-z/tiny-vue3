import { reactive } from './reactivity/reactive.js';

export function equal(oldVal, newVal) {
  return Object.is(oldVal, newVal)
}

export const extend = Object.assign

export function convert(val) {
  return typeof val === 'object' ? reactive(val) : val
}

function getTypeName(val) {
  let str = Object.prototype.toString.call(val);
  return /^\[object (.*)]$/.exec(str)[1];
}

export function isMap(value) {
  return getTypeName(value) === 'Map'
}

export function isSet(value) {
  return getTypeName(value) === 'Set'
}

// https://en.wikipedia.org/wiki/Longest_increasing_subsequence
export function getSequence(arr) {
  const p = arr.slice()
  const result = [0]
  let i, j, u, v, c
  const len = arr.length
  for (i = 0; i < len; i++) {
    const arrI = arr[i]
    if (arrI !== 0) {
      j = result[result.length - 1]
      if (arr[j] < arrI) {
        p[i] = j
        result.push(i)
        continue
      }
      u = 0
      v = result.length - 1
      while (u < v) {
        c = (u + v) >> 1
        if (arr[result[c]] < arrI) {
          u = c + 1
        } else {
          v = c
        }
      }
      if (arrI < arr[result[u]]) {
        if (u > 0) {
          p[i] = result[u - 1]
        }
        result[u] = i
      }
    }
  }
  u = result.length
  v = result[u - 1]
  while (u-- > 0) {
    result[u] = v
    v = p[v]
  }
  return result
}

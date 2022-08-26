export function equal(oldVal, newVal) {
  return Object.is(oldVal, newVal)
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

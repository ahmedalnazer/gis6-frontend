import { writable } from 'svelte/store'

const valueTypes = {
  manualPercent: {
    min: 0,
    max: 500,
    negative: true,
    integer: false,
    precision: 2,
  },
  setpoint: {
    min: 100,
    max: 400,
    negative: false,
    integer: true,
    precision: 1,
  }
}

export const getRanges = type => {
  return valueTypes[type]
}
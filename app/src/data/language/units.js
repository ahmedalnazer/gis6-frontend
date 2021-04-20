import { writable, derived } from 'svelte/store'
import current from './current'


const rawConvert = derived([ current ], ([ current ]) => {
  const converters = {
    temperature: v => v,
    current: v => v,
    percent: v => v
  }
  return ({ type, value }) => {
    const converter = converters[type]
    if(!converter) {
      console.warn(`Missing converter for "${type}"`, { type, value })
      return value
    }
    return converter(value / 10)
  }
})


const convert = derived([ rawConvert, current ], ([ $rawConvert, $current ]) => {
  const units = {
    temperature: {
      unit: '°F',
      precision: 1
    },
    current: {
      unit: 'A',
      precision: 2
    },
    percent: {
      unit: '%',
      precision: 1
    }
  }
  
  return ({ type, value }) => {
    const { unit, precision } = units[type] || {}
    return `${$rawConvert({ type, value }).toFixed(precision || 1)}${unit || ''}`
  }
})

export default convert
import { writable, derived } from 'svelte/store'
import current from './current'


const rawConvert = derived([ current ], ([ current ]) => {
  const converters = {
    temperature: v => v,
    current: v => v
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
    temperature: '°F',
    current: 'A'
  }
  return ({ type, value }) => `${$rawConvert({ type, value })}${units[type] || ''}`
})

export default convert
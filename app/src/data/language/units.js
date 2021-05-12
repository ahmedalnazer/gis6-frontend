import { writable, derived } from 'svelte/store'
import current from './current'

const units = {
  // temperature in degrees
  temperature: {
    getUnit: prefs => {
      if(prefs.compact) return '°'
      return '°F'
    },
    precision: 1,
    convert: (v, prefs) => {
      return v / 10
    }
  },

  // electrical current (e.g. amps)
  current: {
    getUnit: prefs => {
      return 'A'
    },
    precision: 2,
    convert: (v, prefs) => {
      return v / 10
    }
  },

  // percentage values (usually just dividing by 10)
  percent: {
    getUnit: prefs => {
      return '%'
    },
    precision: 1,
    convert: (v, prefs) => {
      return v / 10
    }
  }
}
units.temp = units.temperature
units.percentage = units.percent


const rawConvert = derived([ current ], ([ current ]) => {
  return ({ type, value }) => {
    const converter = units[type] && units[type].convert
    if(!converter) {
      console.warn(`Missing converter for "${type}"`, { type, value })
      return value
    }
    return converter(value)
  }
})


const convert = derived([ rawConvert, current ], ([ $rawConvert, $current ]) => {
  return ({ type, value, compact, precision: customPrecision }) => {
    let { getUnit, precision } = units[type] || {}
    let p = customPrecision
    if(p === undefined) p = precision
    if(p === undefined) p = 1
    if(!getUnit) getUnit = () => {}
    return `${$rawConvert({ type, value }).toFixed(p)}${getUnit({ ...$current, compact }) || ''}`
  }
})

export default convert

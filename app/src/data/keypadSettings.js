import { writable } from 'svelte/store'

// const valueTypes_old = {
//   manualPercent: {
//     min: 0,
//     max: 500,
//     negative: true,
//     integer: false,
//     precision: 2,
//   },
//   setpoint: {
//     min: 100,
//     max: 400,
//     negative: false,
//     integer: true,
//     precision: 1,
//   }
// }

const valueTypes = {
  defaultPercent: {
    description: 'Default Percentage',
    unit: 'percentage',
    min: 0,
    max: 100,
    negative: false,
    integer: false,
    precision: 0,
    valid_entries: []
  },
  defaultSystem: {
    description: 'System Default',
    unit: 'default',
    min: 0,
    max: 500,
    negative: false,
    integer: false,
    precision: 0,
    valid_entries: []
  },
  setpoint: {
    description: 'Temperature Setpoint (Celcius)',
    unit: 'celcius',
    min: 0,
    max: 500,
    negative: false,
    integer: false,
    precision: 0.1,
    valid_entries: []
  },
  deviationLow: {
    description: 'Deviation Low (Celcius)',
    unit: 'celcius',
    min: 1,
    max: 28,
    negative: false,
    integer: false,
    precision: 0,
    valid_entries: []
  },
  deviationHigh: {
    description: 'Deviation High (Celcius)',
    unit: 'celcius',
    min: 1,
    max: 28,
    negative: false,
    integer: false,
    precision: 0,
    valid_entries: []
  },
  manualPercent: {
    description: 'Manual % (Percentage)',
    unit: 'percentage',
    min: 1,
    max: 100,
    negative: false,
    integer: false,
    precision: 0.1,
    valid_entries: []
  },
  trim: {
    description: 'Trim  (Celcius)',
    unit: 'celcius',
    min: -56,
    max: 56,
    negative: true,
    integer: false,
    precision: 0,
    valid_entries: []
  },
  autoStandby: {
    description: 'Auto Standby  (Celcius)',
    unit: 'celcius',
    min: 0,
    max: 500,
    negative: false,
    integer: false,
    precision: 0,
    valid_entries: []
  },
  tcShortDetectTime: {
    description: 'T/C Short Detect Time (Minutes)',
    unit: 'minutes',
    min: 0,
    max: 54,
    negative: false,
    integer: false,
    precision: 0.1,
    valid_entries: []
  },
  tuningOverwrite: {
    description: 'Tuning Overwrite (Integer Values in specified range)',
    unit: 'customRange',
    min: undefined,
    max: undefined,
    negative: false,
    integer: false,
    precision: 0,
    valid_entries: [ -31, -30, -27, -26, -25, -24, -23, -22, -21, -20, -17, -16, -15, -14, -13, -12, -10, -9, -8, -10, -1, 0, 10, 11, 12, 13, 14, 15, 16, 17, 20, 21, 22, 23, 24, 25, 26, 27 ]
  },
  tuningType: {
    description: 'Tuning Type (Integer Values in specified range)',
    unit: 'number',
    min: 0,
    max: 4,
    negative: false,
    integer: false,
    precision: 0.1,
    valid_entries: []
  },
  attenuatedOutput: {
    description: 'Attenuated Output % (Percentage)',
    unit: 'percentage',
    min: 0,
    max: 100,
    negative: false,
    integer: false,
    precision: 0.1,
    valid_entries: []
  },
  powerPriority: {
    description: 'Power Priority (Integer Values in specified range)',
    unit: 'integer',
    min: 0,
    max: 4,
    negative: false,
    integer: false,
    precision: 0,
    valid_entries: []
  },
  lowWattAlarm: {
    description: 'Low Watt Alarm (Watts)',
    unit: 'watts',
    min: 0,
    max: 8000,
    negative: false,
    integer: false,
    precision: 0,
    valid_entries: []
  },
  highWattAlarm: {
    description: 'High Watt Alarm (Watts)',
    unit: 'watts',
    min: 0,
    max: 8000,
    negative: false,
    integer: false,
    precision: 0,
    valid_entries: []
  },
  criticalOverTemperature: {
    description: 'Critical Over Temperature (Celcius)',
    unit: 'celcius',
    min: 0,
    max: 500,
    negative: false,
    integer: false,
    precision: 0,
    valid_entries: []
  },
  maximumTemperatureSetpoint: {
    description: 'Temperature Setpoint Maximum (Celcius)',
    unit: 'celcius',
    min: 0,
    max: 500,
    negative: false,
    integer: false,
    precision: 0,
    valid_entries: []
  },
  maximumManual: {
    description: 'Manual Percentage Maximum (%)',
    unit: 'percent',
    min: 0,
    max: 100,
    negative: false,
    integer: false,
    precision: 0,
    valid_entries: []
  },
  trimCelcius: {
    description: 'Trim (Celcius)',
    unit: 'celcius',
    min: 0,
    max: 518,
    negative: false,
    integer: false,
    precision: 0,
    valid_entries: []
  },
  boostTemperature: {
    description: 'Boost Temperature (Celcius)',
    unit: 'celcius',
    min: 0,
    max: 518,
    negative: false,
    integer: false,
    precision: 0,
    valid_entries: []
  }
}

export const getRanges = type => {
  return valueTypes[type]
}
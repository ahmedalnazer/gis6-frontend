import api from 'data/api'

const defaultGlobals = {
  "SPsAreDegreesC": true,
  "BoostTemperatureSP": 0,
  "BoostTimeSP": 0,
  "BoostRecoveryTimeSP": 0,
  "ManualBoostSP": 0,
  "StandbyTimeoutSP": 0,
  "TrimLimitSP": 0,
  "AlarmAction_DeviationHigh": 0,
  "AlarmAction_DeviationLow": 0,
  "AlarmAction_ThermocoupleOpen": 0,
  "AlarmAction_ThermocoupleReversed": 0,
  "AlarmAction_ThermocoupleShort": 0,
  "AlarmAction_OpenFuse": 0,
  "AlarmAction_HeaterShort": 0,
  "AlarmAction_HeaterOpen": 0,
  "AlarmAction_UncontrolledOutput": 0,
  "AlarmAction_GroundFault": 0,
  "AlarmAction_WattAlarm": 0,
  "AlarmAction_ResistanceMonitor": 0,
  "SequenceStart_Timer1": 0,
  "SequenceStart_Timer2": 0,
  "SequenceStart_Timer3": 0,
  "SequenceStart_Timer4": 0,
  "SequenceCool_StageGroup1": 0,
  "SequenceCool_StageGroup2": 0,
  "SequenceCool_StageGroup3": 0,
  "SequenceCool_StageGroup4": 0,
  "SequenceCool_TemperatureSp1": 0,
  "SequenceCool_TemperatureSp2": 0,
  "SequenceCool_TemperatureSp3": 0,
  "SequenceCool_TemperatureSp4": 0,
  "SequenceCool_Timer1": 0,
  "SequenceCool_Timer2": 0,
  "SequenceCool_Timer3": 0,
  "SequenceCool_Timer4": 0,
  "SeqPowerup_Timer1": 0,
  "SeqPowerup_Timer2": 0,
  "SeqPowerup_Timer3": 0,
  "SeqPowerup_Timer4": 0,
  "MoldDoctorStartTemperature": 0,
  "MoldDoctorOperatingTemperature": 0,
  "MoldDoctorSoakTime": 0,
  "SealTemperatureSP": 0
}

export let globalSettings

export default async function init() {

  const global = await api.get('/global')
  if(!global[0]) {
    globalSettings = await api.post('/global', defaultGlobals)
  } else {
    globalSettings = global[0]
  }

  // globalSettings = await api.put(`/global/${globalSettings.id}`, { BoostTimeSP: 100 })

  // console.log(globalSettings)

}
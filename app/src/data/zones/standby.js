import { derived } from 'svelte/store'
import notify from 'data/notifications'
import { globalSettings } from 'data/init'
import api from 'data/api'
import zones from 'data/zones'
import { activeProcess } from 'data/process'

const activeStandby = derived([ zones ], ([ $zones ]) => {
  return $zones.find(x => x.settings.standby)
})

activeStandby.start = async (zones, StandbySp, params) => {
  await api.post('/zones/boost', { ref_process_id: activeProcess.id, zones: [] })
  await api.post('/zones', {
    ref_process_id: zones[0].ref_process,
    zones: zones.map(x => x.number),
    data: { StandbySp }
  })
  await api.put(`/global/${globalSettings.id}`, params)
  await api.post('/zones/standby', {
    ref_process_id: zones[0].ref_process,
    zones: zones.map(x => x.number)
  })
}

activeStandby.cancel = () => {
  api.post('/zones/standby', { ref_process_id: activeProcess.id, zones: [] })
  notify('Standby canceled')
}

export default activeStandby

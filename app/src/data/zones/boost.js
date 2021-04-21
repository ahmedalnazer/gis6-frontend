import { derived } from 'svelte/store'
import notify from 'data/notifications'
import globalSettings, { $globalSettings } from 'data/globalSettings'
import api from 'data/api'
import { activeProcess } from 'data/process'
import zones from './index'


const activeBoost = derived([ zones ], ([ $zones ]) => {
  return $zones.find(x => x.settings.boost)
})

activeBoost.start = async (zones, params) => {
  await api.post('/zones/standby', { ref_process_id: activeProcess.id, zones: [] })
  await api.put(`/global/${$globalSettings.id}`, params)
  await api.post('/zones/boost', {
    ref_process_id: zones[0].ref_process,
    zones: zones.map(x => x.number)
  })
  globalSettings.reload()
}

activeBoost.cancel = () => {
  api.post('/zones/boost', { ref_process_id: activeProcess.id, zones: [] })
  notify('Boost canceled')
}

export default activeBoost
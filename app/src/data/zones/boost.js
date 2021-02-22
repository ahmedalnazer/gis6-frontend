import { derived } from 'svelte/store'
import notify from 'data/notifications'
import { globalSettings } from 'data/init'
import api from 'data/api'
import { activeProcess } from 'data/process'
import zones from './index'


const activeBoost = derived([ zones ], ([ $zones ]) => {
  return $zones.find(x => x.settings.boost)
})

activeBoost.start = async (zones, StandbySp, params) => {
  await api.post('/zones/standby', { ref_process_id: activeProcess.id, zones: [] })
  // await api.post('/zones', {
  //   ref_process_id: zones[0].ref_process,
  //   zones: zones.map(x => x.number),
  //   data: { StandbySp }
  // })
  await api.put(`/global/${globalSettings.id}`, params)
  await api.post('/zones/boost', {
    ref_process_id: zones[0].ref_process,
    zones: zones.map(x => x.number)
  })
}

activeBoost.cancel = () => {
  api.post('/zones/boost', { ref_process_id: activeProcess.id, zones: [] })
  notify('Boost canceled')
}

export default activeBoost
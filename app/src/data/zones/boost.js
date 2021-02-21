import { writable } from 'svelte/store'
import notify from 'data/notifications'
import { globalSettings } from 'data/init'
import api from 'data/api'

const activeBoost = writable(false)

activeBoost.start = async (zones, StandbySp, params) => {
  // await api.put('/globals', {
    
  // })
  await api.post('/zones/standby', {
    zones: []
  })
  await api.post('/zones', {
    ref_process_id: zones[0].ref_process,
    zones: zones.map(x => x.number),
    data: { StandbySp }
  })
  await api.put(`/global/${globalSettings.id}`, params)
  await api.post('/zones/boost', {
    ref_process_id: zones[0].ref_process,
    zones: zones.map(x => x.number)
  })
}

activeBoost.cancel = () => {
  activeBoost.set(false)
  notify('Boost cancelled')
}

export default activeBoost
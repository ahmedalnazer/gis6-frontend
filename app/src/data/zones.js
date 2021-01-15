import { writable, derived } from 'svelte/store'
import api from 'data/api'

const zones = writable([])


zones.reload = async () => {
  let z = await api.get('zones')

  // TODO: remove dummy zones
  if(z.length == 0) {
    for(let i = 0; i < 50; i++) {
      await api.post('zones', {
        name: `Zone ${i}`,
        id: i
      })
    }
    z = await api.get('zones')
  }

  zones.set(z)
}

zones.create = async zone => {
  await api.post('zones', zone)
  await zones.reload()
}

zones.update = async zone => {
  await api.patch('zones', zone)
  await zones.reload()
}

zones.delete = async zone => {
  await api.delete('zones', zone)
  await zones.reload()
}

zones.reload()


export default zones
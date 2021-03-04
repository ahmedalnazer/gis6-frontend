import { writable } from 'svelte/store'
import api from 'data/api'

const defaultTypes = [
  'Tip',
  'Manifold',
  'Sprue',
  'Spare',
  'Monitor'
]

export const seedTypes = async () => {
  const current = await api.get('/zonetype')
  if(Array.isArray(current) && !current.length) {
    for(let type of defaultTypes) {
      await api.post('/zonetype', {
        name: type,
        isDefault: true,
        isVisible: true
      })
    }
    zoneTypes.reload()
  } else {
    zoneTypes.set(current)
  }
}




const zoneTypes = writable([])

const getTypes = () => {
  let t
  zoneTypes.subscribe(x => t = x)()
  return t
}

zoneTypes.reload = async () => zoneTypes.set(await api.get('/zonetype'))


zoneTypes.create = async data => {
  await api.post('/zonetype', data)
} 

zoneTypes._update = zoneTypes.update

zoneTypes.update = async data => {
  if(!data.id) return
  const { id } = data
  delete data.id
  await api.put(`/zonetype/${id}`, data)
  await zoneTypes.reload()
}

zoneTypes.delete = async data => {
  const id = data.id || data
  await api.delete(`/zonetype/${id}`)
  await zoneTypes.reload()
}



export default zoneTypes
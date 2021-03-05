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
  for(let type of defaultTypes) {
    if(Array.isArray(current) && !current.find(x => x.name == type)) {
      await api.post('/zonetype', {
        name: type,
        isDefault: true,
        isVisible: true
      })
    }
  }
  await zoneTypes.reload()
}


const zoneTypes = writable([])

const getTypes = () => {
  let t
  zoneTypes.subscribe(x => t = x)()
  return t
}

zoneTypes.reload = async () => zoneTypes.set(await api.get('/zonetype'))

// perform cleanup actions based on provided options
const processOptions = async ops => {
  if(!ops.skipReload) {
    await zoneTypes.reload()
  }
}


zoneTypes.create = async (data, ops = {}) => {
  await api.post('/zonetype', data)
  await processOptions(ops)
} 

zoneTypes._update = zoneTypes.update

zoneTypes.update = async (data, ops = {}) => {
  if(!data.id) return
  const { id } = data
  delete data.id
  await api.put(`/zonetype/${id}`, data)
  await processOptions(ops)
}

zoneTypes.delete = async (data, ops = {}) => {
  const id = data.id || data
  await api.delete(`/zonetype/${id}`)
  await processOptions(ops)
}



export default zoneTypes
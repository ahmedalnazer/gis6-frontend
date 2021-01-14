import { writable, derived } from 'svelte/store'
import api from 'data/api'

const _groups = writable([])

const group_order = writable([])

const groups = derived([ _groups, group_order ], ([ $_groups, $group_order ]) => {
  let sorted = []
  for(let g of $group_order) {
    sorted.push($_groups.find(x => x.id == g))
  }
  return sorted.concat($_groups.filter(x => !sorted.includes(x)))
})


groups.reload = async () => {
  _groups.set(await api.get('zonegroups'))
}

groups.create = async group => {
  await api.post('zonegroups', group)
  await groups.reload()
}

groups.update = async group => {
  await api.patch('zonegroups', group)
  await groups.reload()
}

groups.delete = async group => {
  await api.delete('zonegroups', group)
  await groups.reload()
}


export default groups


export const defaultNames = [
  'Tips',
  'Manifold',
  // TODO: get full list
]

export const groupColors = [

]
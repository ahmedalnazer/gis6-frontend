import { writable, derived } from 'svelte/store'
import api from 'data/api'
import { getId } from './tools'

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
  console.log('reloading')
  let zoneGroups = await api.get('zonegroups')

  // TODO: remove dummy groups
  if (zoneGroups.length == 0) {
    await api.post('zonegroups', {
      name: `Tips`,
      color: '#E91E63'
    })
    await api.post('zonegroups', {
      name: `Manifold`,
      color: '#004D40'
    })
    await api.post('zonegroups', {
      name: `Other`,
      color: '#311B92'
    })
    zoneGroups = await api.get('zones')
  }

  console.log(zoneGroups)

  _groups.set(zoneGroups)
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

groups.reload()

export default groups


export const defaultNames = [
  'Tips',
  'Manifold',
  // TODO: get full list
]

export const groupColors = [
  '#B2DFDB',
  '#4DB6AC',
  '#009688',
  '#00796B',
  '#004D40',
  '#D1C4E9',
  '#9575CD',
  '#673AB7',
  '#512DA8',
  '#311B92',
  '#F8BBD0',
  '#F06292',
  '#E91E63',
  '#C2185B',
  '#880E4F'
]
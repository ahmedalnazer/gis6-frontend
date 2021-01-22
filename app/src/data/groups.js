import { writable, derived } from 'svelte/store'
import api from 'data/api'
import { getId } from './tools'

const _isDevEnv = false
const _groups = writable([])

const group_order = writable([])

const groups = derived([ _groups, group_order ], ([ $_groups, $group_order ]) => {
  const decoded = $_groups.map(x => decodeGroup(x))
  let sorted = []
  for(let g of $group_order) {
    sorted.push(decoded.find(x => x.id == g))
  }
  return sorted.concat(decoded.filter(x => !sorted.includes(x)))
})

const decodeGroup = g => {
  const d = {
    ...g,
    name: g.GroupName,
    color: groupColors[g.GroupColor]
  }
  delete d.GroupName
  delete d.GroupColor
  return d
}

const encodeGroup = g => {
  return {
    GroupName: g.name,
    GroupColor: groupColorIndex[g.color]
  }
}

groups.reload = async () => {
  let zoneGroups = await api.get('zonegroup')
  _groups.set(zoneGroups)
}

groups.create = async group => {
  await api.post('zonegroup', encodeGroup(group))
  await groups.reload()
}

groups.update = async group => {
  if (_isDevEnv) {
    // This code is for development environment
    let tempData = localStorage.getItem("all-groups");
    let tempSaveData = JSON.parse(tempData)
    let tempSaveDataFiltered = tempSaveData.filter(x => x.id == group.id)
    let groupColor = "";

    for(let [ key, value ] of Object.entries(groupColors)) {
      if (value == group.color) {
        groupColor = key;
      }
    }

    if (tempSaveDataFiltered.length) {
      tempSaveDataFiltered[0].GroupName = group.name;
      tempSaveDataFiltered[0].GroupColor = groupColor;
    }

    localStorage.setItem("all-groups", JSON.stringify(tempSaveData));

    // await api.patch('zonegroups', group)
    await groups.reload()  
  }
  else {
    const { id } = group
    delete group.id
    await api.put(`zonegroup/${id}`, encodeGroup(group))
    await groups.reload()
  }
}

groups.delete = async group => {
  if (_isDevEnv) {
    // This code is for development environment
    let tempData = localStorage.getItem("all-groups");
    let tempSaveData = JSON.parse(tempData)
    let tempSaveDataFiltered = tempSaveData.filter(x => x.id !== group.id)

    localStorage.setItem("all-groups", JSON.stringify(tempSaveDataFiltered));

    // await api.delete('zonegroups', group)
    await groups.reload()
  } 
  else {
    await api.delete(`zonegroup/${group.id}`)
    await groups.reload()
  }
}

groups.reload()

export default groups


export const defaultNames = [
  'Tips',
  'Manifold',
  'Default 1',
  'Default 2',
  'Default 3',
  'Default 4',
  'Default 5',
  'Default 6',
  // TODO: get full list
]

export const groupColors = {
  1: '#B2DFDB',
  2: '#4DB6AC',
  3: '#009688',
  4: '#00796B',
  5: '#004D40',
  6: '#D1C4E9',
  7: '#9575CD',
  8: '#673AB7',
  9: '#512DA8',
  10: '#311B92',
  11: '#F8BBD0',
  12: '#F06292',
  13: '#E91E63',
  14: '#C2185B',
  15: '#880E4F'
}

let groupColorIndex = {}

for(let [ key, value ] of Object.entries(groupColors)) {
  groupColorIndex[value] = parseInt(key)
}
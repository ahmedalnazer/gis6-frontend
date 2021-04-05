import { writable, derived } from 'svelte/store'
import api from 'data/api'
import { id } from 'data/utils/tools'
import zones from './zones'

const _groups = writable([])
const _groupOrder = writable(JSON.parse(localStorage.getItem('group_order') || '[]'))
export const sortGroups = writable(true)
sortGroups.toggle = () => sortGroups.update(x => !x)

/**
 * Store which returns an Array containing group ids in desired display order
 */
export const group_order = derived([ _groups, _groupOrder ], ([ $_groups, $_groupOrder ]) => {
  // filter non-existent groups from the order list
  const _order = $_groupOrder.map(x => id(x))
  const order = [ ... new Set(_order
    .filter(x => !!$_groups.find(g => id(g.id) == x))
    .concat(
      $_groups.filter(x => !_order.includes(id(x.id))).map(x => id(x.id))
    )
  ) ]
  return order
})

/**
 * Set the display order of the groups globally and persist to localStorage
 * @param {Array} arr - array of group ids in the desired order
 */
export const setGroupOrder = arr => {
  localStorage.setItem('group_order', JSON.stringify(arr))
  _groupOrder.set(arr)
}

/**
 * Sorted list of currently available groups
 */
const groups = derived([ _groups, group_order ], ([ $_groups, $group_order ]) => {
  let sorted = []
  for(let g of $group_order.map(x => id(x))) {
    const f = $_groups.find(x => x.id == g)
    sorted.push(f)
  }
  const groups = sorted.concat($_groups.filter(x => !sorted.includes(x))).filter(x => !!x)
  return groups
})


/**
 * Store containing currently selected group
 */
export const activeGroup = writable(null)


const decodeGroup = g => {
  const d = {
    ...g,
    name: g.GroupName,
    color: groupColors[g.GroupColor],
    ref_zones: g.ref_zones || []
  }
  delete d.GroupName
  delete d.GroupColor
  return d
}

const encodeGroup = g => {
  return {
    GroupName: g.name,
    GroupColor: groupColorIndex[g.color],
    ref_zones: g.ref_zones || []
  }
}

groups.reload = async () => {
  let zoneGroups = (await api.get('zonegroup') || []).map(x => decodeGroup(x))
  _groups.set(zoneGroups)
}

groups.create = async group => {
  const g = await api.post('zonegroup', encodeGroup(group))
  await groups.reload()
  return g
}

groups.update = async group => {
  console.log(group)
  const { id } = group
  delete group.id
  await api.put(`zonegroup/${id}`, encodeGroup(group))
  await groups.reload()
  await zones.reload()
}

groups.delete = async group => {
  await api.delete(`zonegroup/${group.id}`)
  await groups.reload()
  await zones.reload()
}

groups.addZones = async (group, _zones) => {
  const { id } = group
  if(!group.GroupName) group = encodeGroup(group)
  const ref_zones = [ ...new Set(group.ref_zones.concat(_zones.map(z => z.id || z))) ]
  await api.put(`zonegroup/${id}`, { ...group, ref_zones })
  await Promise.all([ zones.reload(), groups.reload() ])
}

groups.removeZones = async (group, _zones) => {
  const { id } = group
  const ids = _zones.map(z => z.id || z)
  const ref_zones = [ ...new Set(group.ref_zones.filter(x => !ids.includes(x))) ]
  await api.put(`zonegroup/${group.id}`, { ...encodeGroup(group), ref_zones })
  await Promise.all([ zones.reload(), groups.reload() ])
}



groups.reload()

export default groups

window.DANGEROUS_dummy_data = async () => {
  let _zones
  zones.subscribe(z => _zones = z)()
  const a = await groups.create({
    name: 'Tips',
    color: '#004D40',
  })
  const b = await groups.create({
    name: 'Manifold',
    color: '#311B92',
  })
  const c = await groups.create({
    name: 'Sprue',
    color: '#C2185B',
  })
  await groups.addZones(a, _zones.slice(0, 10))
  await groups.addZones(b, _zones.slice(10, 20))
  await groups.addZones(c, _zones.slice(15, 30))
}


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
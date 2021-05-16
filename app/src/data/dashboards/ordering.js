import { writable, derived } from 'svelte/store'
import user from 'data/user'

export const tempOrder = writable(null)

export const updateOrder = ({ dashboard, group, order }) => {
  let u
  user.subscribe(x => u = x)()
  tempOrder.update(o => {
    if(!o) o = u.user_card_prefs && u.user_card_prefs.order || {}

    // clone to avoid mutating user
    o = JSON.parse(JSON.stringify(o))

    if(dashboard) {
      if(!o[dashboard]) {
        o[dashboard] = {
          order: [],
          groups: {}
        }
      }
      if(group) {
        if(!o[dashboard].groups[group]) {
          o[dashboard].groups[group] = {
            order: []
          }
        }
        o[dashboard].groups[group].order = order
      } else {
        o[dashboard].order = order
      }
    }
    return o
  })
}


export const cardOrder = derived([ user, tempOrder ], ([ $user, $tempOrder ]) => {
  return { ... $tempOrder || $user && $user.user_card_prefs && $user.user_card_prefs.order || {}}
})

export const getOrder = derived([ cardOrder ], ([ $cardOrder ]) => {
  return ({ dashboard, group }) => {
    if(dashboard) {
      const dash = $cardOrder[dashboard]
      if(!dash) return []
      if(group) {
        const g = dash.groups[group]
        if(!g) return []
        return g.order
      }
      return dash.order
    }
  }
})

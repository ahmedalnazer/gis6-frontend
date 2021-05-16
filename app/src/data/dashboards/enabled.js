import user from 'data/user'
import { derived, writable } from 'svelte/store'

export const tempEnabled = writable(null)

export const enabled = derived([ user, tempEnabled ], ([ $user, $tempEnabled ]) => {
  const uPrefsClone = JSON.parse(JSON.stringify($user && $user.user_card_prefs && $user.user_card_prefs.enabled || {}))
  console.log($tempEnabled, uPrefsClone)
  return $tempEnabled || uPrefsClone
})


export const disableCard = async ({ dashboard, group, card }) => {
  tempEnabled.update(enabled => {
    if(!enabled) enabled = {}
    if(!enabled[dashboard]) enabled[dashboard] = {}
    if(!enabled[dashboard][group]) enabled[dashboard][group] = {}
    enabled[dashboard][group][card] = false

    return enabled
  })
}

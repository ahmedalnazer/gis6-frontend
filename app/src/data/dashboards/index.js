import data from './dashboard-data'
import user from 'data/user'
import { updateUserProfile } from 'data/user/actions'
import { cardOrder, tempOrder } from './ordering'
import { enabled as _enabled, tempEnabled } from './enabled'

export { cardOrder, tempOrder, updateOrder, getOrder } from './ordering'
export { disableCard, tempEnabled } from './enabled'


export const commitPreferences = async () => {
  let order, enabled, usr
  cardOrder.subscribe(t => order = t)()
  _enabled.subscribe(e => enabled = e)()
  user.subscribe(u => usr = u)()
  const prefs = usr.user_card_prefs
  const user_card_prefs = { ...prefs, enabled, order }
  await updateUserProfile(usr.id, { user_card_prefs })
  tempOrder.set(null)
  tempEnabled.set(null)
}


export default data

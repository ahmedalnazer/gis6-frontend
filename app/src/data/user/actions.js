import { writable } from 'svelte/store'
import api from '../api'
import notify from '../notifications'
import { users } from './index'


export const loggingIn = writable(false)
export const logIn = () => loggingIn.set(true)


// load all current users into state
const loadUsers = async () => {
  // const u = await api.get('/auth/user/list')
  const u = await api.get('/v2/user/profile')
  if(u && u.length == 0) {
    try {
      await createUser({
        username: 'Admin',
        password: 'G!S64Ever',
        email: 'admin@gis6.com',
        role: 1,
        first_name: 'GIS6',
        last_name: 'Admin',
        language: 'en-US'
      })
    } catch(e) {
      // ignore 445 error if needed
    }
  }
  users.set(u || [])
}


// initialize
loadUsers()


/**
 * Create a user
 * @param {Object} user  -  User object to be persisted
 * @param {string} user.first_name  -  User's first name
 * @param {string} user.last_name  -  User's last name
 * @param {string} user.email  -  User's email
 * @param {string} user.language  -  User's language preference
 * @param {string} user.username  -  User's "login id"
 * @param {string} user.password  -  User's cleartext password
 * @param {string} user.role  -  User's security level / role
 */
export const createUser = async user => {
  // post new user
  // const u = await api.post('auth/user', user)
  const u = await api.post('/v2/user/profile/', user)
  if(u.error) {
    // notify user if there's an error
    notify.error(u.error)
  } else {
    // refresh state
    await loadUsers()
  }
}


/**
 * Create a user
 * @param {Object|string} user  -  User object or id to be persisted
 */
export const deleteUser = async user => {
  // post new user
  // const data = await api.delete(`/auth/user/${user.id}`)
  const data = await api.delete(`/v2/user/profile/${user.id}`)

  notify('User successfully deleted')
  // refresh state
  await loadUsers()
}


/**
 * Declaritively update a user
 * @param {Object} user  -  User object or id to be persisted
 * @param {string} user.id - User id is a required field, all other fields values will be persisted
 */
export const updateUser = async user => {
  // post new user
  // const data = await api.put(`/auth/user/${user.id}`, user)
  const data = await api.put(`/v2/user/profile/${user.id}`, user)
  notify.success('User profile updated')
  // refresh state
  await loadUsers()
}

/**
 * Declaritively update a user's profile data
 * @param {string} id - Target user's id
 * @param {Object} patch - Object containing updated fields
 */
export const updateUserProfile = async (id, patch) => {
  // patch user record
  const data = await api.patch(`v2/user/profile/${id}`, patch)
  // refresh loaded user
  await api.update()
}

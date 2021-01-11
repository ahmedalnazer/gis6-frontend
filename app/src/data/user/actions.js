import api from '../api'
import notify from '../notifications'
import { users } from './index'


// load all current users into state
const loadUsers = async () => {
  const u = await api.get('/auth/user/list')
  if(u && u.length == 0) {
    try {
      await api.post('auth/user/create/', {
        username: 'Admin',
        password: 'G!S64Ever.',
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
 * @param {string[]} user.categories  -  List of user's categories
 */
export const createUser = async user => {
  // post new user
  const u = await api.post('/create-user', user)
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
  const u = await api.post('/delete-user', { id: user.id || user })
  if(u.error) {
    // notify user if there's an error
    notify.error(u.error)
  } else {
    notify('User successfully deleted')
    // refresh state
    await loadUsers()
  }
}


/**
 * Declaritively update a user
 * @param {Object} user  -  User object or id to be persisted
 * @param {string} user.id - User id is a required field, all other fields values will be persisted
 */
export const updateUser = async user => {
  // post new user
  const u = await api.post('/update-user', user)
  if(u.error) {
    // notify user if there's an error
    notify.error(u.error)
  } else {
    notify.success('User profile updated')
    // refresh state
    await loadUsers()
  }
}

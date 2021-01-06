import user from './user'
import notify from './notifications'

let disconnectLock

class API {
  constructor() {
    this.update()
  }

  update = async () => {
    try {
      this.status = await this.get('check-status')
    } catch(e) {
      console.error(e)
      this.status = { user: {}}
    }
    user.set(this.status.user)
  }

  login = async (user, password) => {
    const data = await this.post('login', { user, password })
    if(data.error) {
      notify.error(data.error)
    } else {
      await this.update()
      notify.success(`Signed in`)
    }
  }

  logout = async () => {
    await this.post('logout')
    await this.update()
    notify('You have succesfully been logged out')
  }


  // generic request function, essentially contextualized fetch request
  request = (url, data, { method }) => {

    // make initial slash optional
    if (url.startsWith('/')) url = url.slice(1)
    return new Promise(async (resolve, reject) => {
      // prefix all routes with api
      let opts = {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        method: method
      }
      if(method != 'GET' && data) {
        opts.body = JSON.stringify(data)
      }
      const fail = (msg) => {
        if(!disconnectLock) {
          disconnectLock = setTimeout(() => disconnectLock = null, 3000)
          notify.error(msg || 'Sorry, we seem to be having trouble connecting to the server')
        }
      }
      fetch(`/api/${url}`, opts)
        .then(async resp => {
          if(resp && resp.status == 403) {
            fail('Sorry, it seems like your admin session has expired, please try logging in again')
            return reject(resp)
          } else if(!resp || resp.status != 200) {
            fail()
            return reject(resp)
          }
          try {
            resolve(resp.json().catch(e => reject(e)))
          } catch (e) {
            resolve(resp)
          }
        })
        .catch(async err => {
          fail()
          reject(err)
        })
    })
  }

  get = (url, data, options) => {
    if(data) {
      const queries = Object.keys(data).map(key => `${key}=${data[key]}`)
      url = `${url}?${queries.join('&')}`
    }
    return this.request(url, {}, { ...options, method: 'GET' })
  }

  post = (url, data, options) => {
    return this.request(url, data, { ...options, method: 'POST' })
  }
}

const api = new API()
export default api

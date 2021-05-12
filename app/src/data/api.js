import user from './user'
import notify from './notifications'
import getStub from './api-stubs'
import history from 'router/history'
import { CookieStorage } from 'cookie-storage'
import _ from './language'

const $_ = (...args) => {
  let translate
  _.subscribe(t => translate = t)()
  return translate(...args)
}

const cookieStorage = new CookieStorage({
  sameSite: 'Lax'
})



const offline = import.meta.env.SNOWPACK_PUBLIC_OFFLINE == 'true'
const apiTarget = import.meta.env.SNOWPACK_PUBLIC_API_URL || ''
if(apiTarget) {
  console.warn(`Overriding default API integration, targeting "${apiTarget}"`)
}


// "fuzzy" url conversion
const getUrl = url => {
  // make initial slash optional
  if (url.startsWith('/')) url = url.slice(1)

  // add trailing slash to avoid 400 errors
  if (!url.endsWith('/') && !url.includes("?")) url = url + '/'

  // prefix all routes with api
  if (url.startsWith('api/')) url = url.replace('api/', '')

  return url
}



let disconnectLock

/**
 * Base API interaction class
 */
class API {
  constructor() {
    this.update()
  }

  // TODO: finalize and document
  update = async () => {
    try {
      this.loadJWT()
      await this.updateToken()
      this.status = await this.get('auth/status')
    } catch(e) {
      console.error(e)
      this.status = { user: {}}
    }
    user.set(this.status && this.status.user.username && this.status.user)
  }

  loadJWT = () => {
    const keys = cookieStorage.getItem('auth')
    if(keys) {
      try {
        const { access, refresh } = JSON.parse(keys)
        this.token = access
        this.refresh = refresh
      } catch(e) {
        // assume JSON has been corrupted somehow
      }
    }
  }

  updateJWT = data => {
    const { access, refresh } = data
    cookieStorage.setItem('auth', JSON.stringify({ access, refresh }))
    this.token = access
    this.refresh = refresh
  }

  updateToken = async () => {
    if(this.refresh) {
      const data = await this.post('/auth/token/refresh', { refresh: this.refresh })
      // const data = await this.post('/v2/user/token/refresh', { refresh: this.refresh })
      if(data.code && data.code == 'token_not_valid') {
        cookieStorage.removeItem('auth')
      } else {
        this.updateJWT(data)
      }
    }
  }

  // TODO: finalize and document
  login = async (username, password) => {
    const data = await this.post('auth/token/obtain', { username, password })
    // const data = await this.post('/v2/user/token/obtain/', { username, password })
    if(!data.access) {
      notify.error($_('Invalid username or password'))
      return false
    } else {
      this.updateJWT(data)
      await this.update()
      notify.success($_('Signed in'))
      return true
    }
  }

  // TODO: finalize and document
  logout = async (msg) => {
    let u
    user.subscribe(current => u = current)()
    try {
      await this.post('auth/logout', { refresh_token: this.refresh, user: u.id })
      // await this.post('/v2/user/logout/', { refresh_token: this.refresh, user: u.id })
    } catch(e) {
      console.error(e)
      // assume JSON parsing error, may need to revisit
    }
    this.status.user = {}
    user.set(null)
    history.push('/')
    notify(msg || $_('You have succesfully logged out'))
  }


  /**
   * generic request function, essentially contextualized fetch request
   * @param {string} url  -  requested url, optionally beginning with '/'
   * @param {Object} data  -  data to be passed to API (ignored for GET requests)
   * @param {Object} options = configuration options
   * @param {string} options.method = request method, e.g. 'GET' or 'POST'
   *
   * @returns {Promise} returns request
   */
  request = (url, data, { method }) => {

    url = getUrl(url)

    return new Promise(async (resolve, reject) => {

      // call stub function if available and return
      const stub = getStub(method, url, data)
      if(stub) {
        return resolve(stub)
      }

      let opts = {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        method: method
      }

      if(this.token) {
        opts.headers['Authorization'] = `JWT ${this.token}`
      }
      if(method != 'GET' && data) {
        opts.body = JSON.stringify(data)
      }
      const fail = (msg) => {
        if(!disconnectLock && !offline) {
          disconnectLock = setTimeout(() => disconnectLock = null, 3000)
          notify.error(msg || $_('Sorry, we seem to be having trouble connecting to the server'))
        }
      }

      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => {
          controller.abort()
          reject('request timed out')
          fail()
        }, 10 * 1000)
        const resp = await fetch(`${apiTarget}/api/${url}`, { ...opts, signal: controller.signal })
        clearTimeout(timeout)
        if (resp && resp.status == 403) {
          fail($_('Sorry, it seems like your user session has expired, please try logging in again'))
          return reject(resp)
        } else if (!resp || resp.status > 500) {
          fail()
          // return reject(resp)
        }
        try {
          try {
            let body
            try {
              body = await resp.json()
            } catch {
              body = resp
            }

            // recover from expired token
            if(resp.status == 401 && body.code && body.code == 'token_not_valid') {
                // if(!url.includes('/v2/user/token/refresh/')) {
                if(!url.includes('auth/token/refresh')) {
                await this.updateToken()
                return resolve(await api.request(url, data, { method }))
              } else {
                fail($_('Sorry, it seems like your user session has expired, please try logging in again'))
                this.updateJWT({ access: '', refresh: '' })
                user.set(null)
              }
            }
            resolve(body)
          } catch(e) {
            reject(e)
          }
        } catch (e) {
          resolve(resp)
        }
      } catch(e) {
        console.error(e)
        fail()
        // reject(err)
      }
    })
  }

  /**
   * make GET request, essentially contextualized fetch request
   * @param {string} url - requested url, optionally beginning with '/'
   * @param {Object} data - data to be passed (must be serializable, will be appended to query string)
   * @param {Object} options - configuration options
   *
   *
   * @returns {Promise} returns GET request response
   */
  get = (url, data, options) => {
    if(data) {
      const queries = Object.keys(data).map(key => `${key}=${data[key]}`)
      url = `${url}?${queries.join('&')}`
    }
    return this.request(url, {}, { ...options, method: 'GET' })
  }

  /**
   * make POST request, essentially contextualized fetch request
   * @param {string} url  -  requested url, optionally beginning with '/'
   * @param {Object} data  -  Object to be posted to the url
   * @param {Object} options - configuration options
   *
   * @returns {Promise} returns POST request response
   */
  post = (url, data, options) => {
    return this.request(url, data, { ...options, method: 'POST' })
  }

  /**
   * make PUT request, essentially contextualized fetch request
   * @param {string} url  -  requested url, optionally beginning with '/'
   * @param {Object} data  -  Object to be sent to the url
   * @param {Object} options - configuration options
   *
   * @returns {Promise} returns POST request response
   */
  put = (url, data, options) => {
    return this.request(url, data, { ...options, method: 'PUT' })
  }

  /**
   * make PATCH request, essentially contextualized fetch request
   * @param {string} url  -  requested url, optionally beginning with '/'
   * @param {Object} data  -  Object to be sent to the url
   * @param {Object} options - configuration options
   *
   * @returns {Promise} returns PATCH request response
   */
  patch = (url, data, options) => {
    return this.request(url, data, { ...options, method: 'PATCH' })
  }

  /**
   * make DELETE request, essentially contextualized fetch request
   * @param {string} url  -  requested url, optionally beginning with '/'
   * @param {Object} data  -  Object to be sent to the url
   * @param {Object} options - configuration options
   *
   * @returns {Promise} returns DELETE request response
   */
  delete = (url, data, options) => {
    return this.request(url, data, { ...options, method: 'DELETE' })
  }
}

const api = new API()
export default api

import user from './user'
import notify from './notifications'
import getStub from './api-stubs'
import history from 'router/history'

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
      this.status = await this.get('auth/status')
      // console.log(this.status)
    } catch(e) {
      console.error(e)
      this.status = { user: {}}
    }
    user.set(this.status && this.status.user.username && this.status.user)
  }

  // TODO: finalize and document
  login = async (username, password) => {
    const data = await this.post('auth/token/obtain', { username, password })
    if(!data.access) {
      notify.error('Invalid username or password')
      return false
    } else {
      this.token = data.access
      this.refresh = data.refresh
      console.log(data)
      await this.update()
      notify.success(`Signed in`)
      return true
    }
  }

  // TODO: finalize and document
  logout = async () => {
    let u
    user.subscribe(current => u = current)()
    await this.post('auth/logout', { refresh_token: this.refresh, user: u.id })
    this.status.user = {}
    user.set(null)
    history.push('/')
    notify('You have succesfully logged out')
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
          notify.error(msg || 'Sorry, we seem to be having trouble connecting to the server')
        }
      }

      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 10 * 1000)
        const resp = await fetch(`${apiTarget}/api/${url}`, { ...opts, signal: controller.signal })
        clearTimeout(timeout)
        if (resp && resp.status == 403) {
          fail('Sorry, it seems like your admin session has expired, please try logging in again')
          return reject(resp)
        } else if (!resp || resp.status > 500) {
          fail()
          // return reject(resp)
        }
        try {
          resolve(resp.json().catch(e => reject(e)))
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

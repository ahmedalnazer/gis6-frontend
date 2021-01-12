import user from './user'
import notify from './notifications'
import stubs from './api-stubs'


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
    } catch(e) {
      console.error(e)
      this.status = { user: {}}
    }
    user.set(this.status && this.status.user)
  }

  // TODO: finalize and document
  login = async (username, password) => {
    const data = await this.post('auth/token/obtain', { username, password })
    console.log(data)
    if(!data.access) {
      notify.error('Invalid username or password')
    } else {

      this.token = data.access
      this.refresh = data.refresh

      await this.update()
      notify.success(`Signed in`)
    }
  }

  // TODO: finalize and document
  logout = async () => {
    await this.post('logout')
    await this.update()
    notify('You have succesfully been logged out')
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

    // make initial slash optional
    if (url.startsWith('/')) url = url.slice(1)

    return new Promise(async (resolve, reject) => {

      // call stub function if available and return
      if(stubs && stubs[method] && stubs[method][url]) {
        console.warn(`RETURNING STUB DATA FOR '${url}'`)
        return resolve(stubs[method][url](data))
      }

      if(method == 'POST' && !url.endsWith('/')) url = url + '/'

      // prefix all routes with api
      let opts = {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        method: method
      }

      if(this.token) {
        opts.headers['Authorization'] = `Bearer ${this.token}`
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
      fetch(`/${url}`, opts)
        .then(async resp => {
          if(resp && resp.status == 403) {
            fail('Sorry, it seems like your admin session has expired, please try logging in again')
            return reject(resp)
          } else if(!resp || resp.status > 500) {
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
}

const api = new API()
export default api

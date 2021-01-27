import { getId } from 'data/tools'
import Route from 'route-parser'

const offline = import.meta.env.SNOWPACK_PUBLIC_OFFLINE == 'true'
if(offline) {
  console.warn(`
INITIALIZED IN OFFLINE MODE

Dummy data will be pulled in from 'api-stubs.js' where available, be sure to switch this off when testing API integration
  `)
}


// functions for CRUD on dummy data

const getCollection = label => {
  try {
    const tag = `all-${label}`
    let resave = false
    const collection = JSON.parse(localStorage.getItem(tag) || JSON.stringify([]) ).map(x => {
      if(!x.id) {
        x.id = getId()
        resave = true
      }
      return x
    })
    if(resave) localStorage.setItem(tag, JSON.stringify(collection))
    return collection
  } catch(e) {
    console.error(e)
    return []
  }
}

const setCollection = (label, data) => {
  localStorage.setItem(`all-${label}`, JSON.stringify(data))
}

const create = (label, data) => {
  setCollection(label, getCollection(label).concat(data))
}

const update = (label, data) => {
  setCollection(label, getCollection(label).map(x => x.id == data.id ? { ...x, ...data } : x))
  return data
}

const deleteItem = (label, data) => {
  setCollection(label, getCollection(label).filter(x => x.id != data.id))
  return u
}

let stubs = {
  GET: {
    'zonegroup': () => getCollection('groups'),
    'zone': () => getCollection('zones')
  },
  POST: {
    'zonegroup': data => create('groups', data),
    'zone': data => create('zones', data)
  },
  PUT: {
    'zonegroup/:id': data => update('groups', data),
    'zone/:id': data => update('zones', data)
  },
  DELETE: {
    'zonegroup/:id': data => deleteItem('groups', data),
    'zone/:id': data => deleteItem('zones', data)
  }
}

if(!offline) {
  stubs = {}
}

export default function getStub(method, url, data) {
  if (stubs && stubs[method] && stubs[method][url]) {
    const routes = Object.keys(stubs[method]).map(x => ({
      route: new Route(x),
      fn: stubs[method][x]
    }))

    for (let r of routes) {
      const m = r.route.match(url.toLowerCase())
      console.warn(`RETURNING STUB DATA FOR '${url}'`)
      if (m) return r.fn(data, m)
    }
  }
  return null
}

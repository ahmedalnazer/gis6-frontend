import { getId } from 'data/tools'

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

const stubs = {
  GET: {
    'zonegroups': () => getCollection('groups'),
    'zones': () => getCollection('zones')
  },
  POST: {
    'zonegroups': data => create('groups', data),
    'zones': data => create('zones', data)
  },
  PATCH: {
    'zonegroups': data => update('groups', data),
    'zones': data => update('zones', data)
  },
  DELETE: {
    'zonegroups': data => deleteItem('groups', data),
    'zones': data => deleteItem('zones', data)
  }
}


export default stubs

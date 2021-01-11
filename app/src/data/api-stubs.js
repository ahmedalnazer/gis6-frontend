import { getId } from 'data/tools'

const defaultUser = {
  username: 'MJacobi',
  email: 'test@test.com',
  role: 'Process Engineer',
  id: 'mjacobi'
}

const tempUsers = () => {
  try {
    let resave = false
    const allUsers = JSON.parse(localStorage.getItem('all-users') || JSON.stringify([ defaultUser ]) ).map(x => {
      if(!x.id) {
        x.id = getId()
        resave = true
      }
      return x
    })
    if(resave) localStorage.setItem('all-users', JSON.stringify(allUsers))
    return allUsers
  } catch(e) {
    console.error(e)
    return [ defaultUser ]
  }
}

const stubs = {
  GET: {
    'all-users': tempUsers,
  },
  POST: {
    'create-user': u => {
      localStorage.setItem('all-users', JSON.stringify(tempUsers().concat(u)))
      return u
    },
    'delete-user': u => {
      localStorage.setItem('all-users', JSON.stringify(tempUsers().filter(x => x.id != u.id)))
      return u
    },
    'update-user': u => {
      localStorage.setItem('all-users', JSON.stringify(tempUsers().map(x => x.id == u.id ? { ...x, ...u } : x)))
      return u
    }
  }
}


export default stubs

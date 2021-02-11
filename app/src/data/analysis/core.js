
export default class Analysis {
  constructor(type = '', zones = [], def = {}, store = {}, destroy = function(){}) {
    self.type = type
    self.default = def
    self.store = store
    self.destroy = destroy
    self.zones = zones
    self.errors = []
    self.update()
  }

  update(progress) {
    self.store.set({
      ...self.default,
      zones: self.zones,
      errors: self.errors,
      progress
    })
  }

  start(zones) {
    self.zones = zones
    self.status = 'initialized'
  }

  cancel() {
    self.destroy()
  }
}
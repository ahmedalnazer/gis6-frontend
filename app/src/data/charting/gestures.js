export default class Gestures {
  constructor() {
    this.panX = 0
    this.panY = 0
    
    this.zoomX = 0
    this.zoomY = 0

    this.factoredX = 0
    this.factoredY = 0
    this.panXZoom = 0
    this.panYZoom = 0

    this.listeners = []
    this.completeListeners = []

    this.pointers = []

    this.prevDiff = 0
    this.prevX = null
    this.prevY = null
  }

  set = obj => {
    for(let [ key, val ] of Object.entries(obj)) {
      this[key] = val
    }
  }

  subscribe = (fn) => {
    this.listeners.push(fn)
    return () => {
      this.listeners = this.listeners.filter(x => x != fn)
    }
  }

  subscribeComplete = (fn) => {
    this.completeListeners.push(fn)
    return () => {
      this.completeListeners = this.completeListeners.filter(x => x != fn)
    }
  }

  pointerdown = (e)  => {
    this.prevX = e.clientX
    this.prevY = e.clientY
    this.pointers.push(e)
  }

  wheelTimeout = null

  move = (e) => {
    const width = e.target.offsetWidth
    e.preventDefault()
    e.stopPropagation()
    if(e.deltaY || e.deltaY === 0) {
      clearTimeout(this.wheelTimeout)
      const change = Math.max(1, Math.abs(this.zoomX) / 100) * e.deltaY
      this.zoomX = Math.max(-100, Math.min(10000, this.zoomX + change))
      const xRatio = Math.abs(this.panXZoom + 100.1) / (this.zoomX + 100.1)
      this.panX = this.factoredX * xRatio + (width - e.clientX)
      this.wheelTimeout = setTimeout(() => {
        this.fireComplete()
      }, 100)
    } else if(this.pointers.length == 1) {
      this.panY += this.prevY - e.clientY
      this.panX += e.clientX - this.prevX
      this.prevX = e.clientX
      this.prevY = e.clientY
    } else if(this.pointers.length == 2) {
      // Find this event in the cache and update its record with this event
      for (var i = 0; i < this.pointers.length; i++) {
        if (e.pointerId == this.pointers[i].pointerId) {
          this.pointers[i] = e
          break
        }
      }
      const curDiff = Math.abs(this.pointers[0].clientX - this.pointers[1].clientX)

      this.zoom += curDiff - this.prevDiff
      this.prevDiff = curDiff
    }

    const { panX, panY, zoomX, zoomY } = this
    
    for (let fn of this.listeners) {
      fn({ panX, panY, zoomX, zoomY })
    }
    return false
  }

  fireComplete = () => {
    this.factoredX = this.panX
    this.panXZoom = this.zoomX
    this.factoredY = this.panY
    this.panYZoom = this.zoomY
    for (let fn of this.completeListeners) {
      fn()
    }
  }

  pointerup = (e) => {
    this.pointers = this.pointers.filter(x => x.pointerId != e.pointerId)
    if (this.pointers.length < 2) {
      this.prevDiff = 0
    }
    if(this.pointers.length == 0) {
      this.fireComplete()
    }
  }
}
export default class Gestures {
  constructor() {
    this.panX = 0
    this.panY = 0
    
    this._zoomX = 0
    this._zoomY = 0
    this.zoomX = 1
    this.zoomY = 1

    this.listeners = []
    this.completeListeners = []

    this.pointers = []

    this.prevDiffX = 0
    this.prevDiffY = 0
    this.prevX = null
    this.prevY = null

    this.resetZoom()
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
    const width = e.target.width
    const height = e.target.height

    e.preventDefault()
    e.stopPropagation()
    let zoomChangeX = 0
    let zoomChangeY = 0

    const cacheZoom = () => {
      this.zoomOffsetX = this.panX
      this.zoomOffsetY = this.panY
      this.zoomOriginalX = this.zoomX
      this.zoomOriginalY = this.zoomY
      this.fireComplete(false)
    }

    if(e.deltaY || e.deltaY === 0) {
      
      if (this.zoomOriginX == null) {
        this.zoomOriginX = e.clientX
        this.zoomOriginY = e.clientY
        cacheZoom()
      }

      clearTimeout(this.wheelTimeout)
      zoomChangeX = Math.max(1, Math.abs(this._zoomX) / 100) * e.deltaY
      zoomChangeY = Math.max(1, Math.abs(this._zoomY) / 100) * e.deltaY

      this.wheelTimeout = setTimeout(() => {
        this.fireComplete()
      }, 300)

    } else if (this.pointers.length == 2) {
      // Find this event in the cache and update its record with this event
      for (var i = 0; i < this.pointers.length; i++) {
        if (e.pointerId == this.pointers[i].pointerId) {
          this.pointers[i] = e
          break
        }
      }


      const curDiffX = Math.abs(this.pointers[0].clientX - this.pointers[1].clientX)
      const curDiffY = Math.abs(this.pointers[0].clientY - this.pointers[1].clientY)

      let needsChange = this.prevDiffX || this.prevDiffY

      let xChange = this.prevDiffX - curDiffX
      let yChange = this.prevDiffY - curDiffY
      this.prevDiffY = curDiffY
      this.prevDiffX = curDiffX

      if(needsChange) {
        if (this.zoomOriginX == null) {
          const dX = this.pointers[0].clientX - this.pointers[1].clientX
          const dY = this.pointers[0].clientY - this.pointers[1].clientY
          this.zoomOriginX = this.pointers[0].clientX + dX / 2
          this.zoomOriginY = this.pointers[0].clientY + dY / 2
          cacheZoom()
        }
        zoomChangeX = Math.max(1, Math.abs(this._zoomX) / 100) * xChange / 2
        zoomChangeY = Math.max(1, Math.abs(this._zoomY) / 100) * yChange / 2
      }

    } else if(this.pointers.length == 1) {
      this.panY += e.clientY - this.prevY
      this.panX += (e.clientX - this.prevX) * this.zoomX
      this.prevX = e.clientX
      this.prevY = e.clientY
    }

    if(zoomChangeX || zoomChangeY) {
      this._zoomX = Math.max(-100, Math.min(10000, this._zoomX + zoomChangeX))
      this._zoomY = Math.max(-100, Math.min(10000, this._zoomY + zoomChangeY))

      this.zoomY = (this._zoomY + 105) / 100
      this.zoomX = (this._zoomX + 105) / 100

      const centerX = width / 2

      // console.log(this.zoomX, this.zoomOriginX - centerX, this.zoomOriginalX)
      // this.panX = this.zoomOffsetX + (centerX - this.zoomOriginX) * this.zoomX
      // this.panY = this.zoomOffsetY + this.zoomOriginY * (this.zoomY / this.zoomOriginalY)
    }

    this.publish()
    return false
  }

  publish = () => {
    const { panX, panY, zoomX, zoomY } = this

    for (let fn of this.listeners) {
      fn({ panX, panY, zoomX, zoomY })
    }
  }

  resetZoom = () => {
    this.zoomOriginX = null
    this.zoomOriginY = null
    this.zoomOffsetX = null
    this.zoomOffsetY = null
    this.zoomOriginalX = null
    this.zoomOriginalY = null
  }

  fireComplete = (doReset = true) => {
    if(doReset) this.resetZoom()
    for (let fn of this.completeListeners) {
      fn()
    }
  }

  pointerup = (e) => {
    this.pointers = this.pointers.filter(x => x.pointerId != e.pointerId)
    if (this.pointers.length < 2) {
      this.prevDiffX = 0
      this.prevDiffY = 0
    }
    if(this.pointers.length == 0) {
      this.fireComplete()
    }
  }
}
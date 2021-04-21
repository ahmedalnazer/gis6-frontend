let activeSelection = true

export const startSelection = (touchStartEl, callback) => {
  let selectedZoneElements = []
  // const zones = touchStartEl.target.closest('.zones')
  // const clientRect = zones.getBoundingClientRect()

  const getAxis = e => {
    const axis = {
      x: e.pageX || e.touches[0].pageX,
      y: e.pageY || e.touches[0].pageY
    }
    return axis
  }

  const createRubberBandingElement = () => {
    let box = document.createElement('div')
    box.id = 'rubber-banding'
    box.style.zIndex = '11'
    box.style.position = "fixed"
    box.style.left = `${touchStartX}px`
    box.style.top = `${touchStartY}px`
    box.style.opacity = '0.5'
    box.style.background = "green"
    document.body.append(box)
  }

  const elemntAxis = getAxis(touchStartEl)
  const touchStartX = elemntAxis.x
  const touchStartY = elemntAxis.y

  createRubberBandingElement()

  const getZones = () => {
    return [ ...document.body.querySelectorAll(".rb-box") ]
  }

  const filterZones = rb => {
    const selectionRectangle = rb.getBoundingClientRect()
    getZones().forEach(function(element) {
      const box = element.getBoundingClientRect()
      if (
        selectionRectangle.left <= box.right &&
        selectionRectangle.right >= box.left &&
        (selectionRectangle.top <= box.bottom &&
        selectionRectangle.bottom >= box.top)
      ) {
        selectedZoneElements.push([ element.dataset.id, element.dataset.group ])
      }
    })
  }

  const touchMoveHandler = e => {
    const axis = getAxis(e)
    const currentX = axis.x
    const currentY = axis.y
    let rubberBox = document.getElementById("rubber-banding")

    const offsetX = currentX - touchStartX

    const minX = Math.min(currentX, touchStartX)
    const minY = Math.min(currentY, touchStartY)
    const maxX = Math.max(currentX, touchStartX)
    const maxY = Math.max(currentY, touchStartY)

    if((offsetX > 20 || offsetX < -20) && rubberBox){
      activeSelection = true
      rubberBox.style.width = `${maxX - minX}px`
      rubberBox.style.height = `${maxY - minY}px`
      rubberBox.style.top = `${minY}px`
      rubberBox.style.left = `${minX}px`
    }
    touchStartEl.preventDefault()
  }

  const touchEndHandler = e => {
    let rubberBox = document.getElementById("rubber-banding")

    if (rubberBox) {
      filterZones(rubberBox)
      if(activeSelection) callback(selectedZoneElements)
      selectedZoneElements.splice(0, selectedZoneElements.length)
      rubberBox.remove()
      document.removeEventListener('mousemove', touchMoveHandler)
      document.removeEventListener('touchmove', touchMoveHandler)
      document.removeEventListener('touchend', touchEndHandler)
      document.removeEventListener('mouseup', touchEndHandler)
    }
    activeSelection = false
  }

  document.addEventListener('mousemove', touchMoveHandler)
  document.addEventListener('touchmove', touchMoveHandler)
  document.addEventListener('touchend', touchEndHandler)
  document.addEventListener('mouseup', touchEndHandler)
}
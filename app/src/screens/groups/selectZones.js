export const startSelection = (e, callback) => {
  let selectedZoneElements = []
  // add event listeners to document to detect position and size of rectangle

  // maybe touchend? https://developer.mozilla.org/en-US/docs/Web/API/Touch_events/Supporting_both_TouchEvent_and_MouseEvent
  document.addEventListener('mouseup', e => {
    callback(selectedZoneElements)
  })

  // note: make sure you clean up event listeners after calling the callback
}
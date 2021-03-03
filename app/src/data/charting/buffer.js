let buffer = {
  entries: [],
  active: [],
  paused: false
}

export default buffer

buffer.write = function(data) {
  const date = new Date()
  buffer.entries.push({
    data,
    date,
    time: date.getTime(),
  })
  buffer.entries = buffer.entries.slice(-7500)
  if(!buffer.paused) {
    buffer.active = [ ...buffer.entries ]
  }
  // console.log(buffer.entries.length)
}
buffer.play = () => buffer.paused = false
buffer.pause = () => buffer.paused = true

let buffer = {
  entries: [],
  active: [],
  paused: false
}

export default buffer


buffer.write = function(data) {
  // console.log('updating', data)
  buffer.entries = [ ...buffer.entries, ...data ].filter(x => !!x).slice(-7500)
  buffer.entries.sort((a, b) => a.time - b.time)
  if(!buffer.paused) {
    buffer.active = [ ...buffer.entries ]
  }
}
buffer.reset = () => buffer.entries = []
buffer.play = () => buffer.paused = false
buffer.pause = () => buffer.paused = true

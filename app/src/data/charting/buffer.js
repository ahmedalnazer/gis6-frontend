let buffer = {
  entries: []
}

export default buffer

buffer.write = function(data) {
  // dummy testing
  data = data.concat(data).concat(data)
  buffer.entries.push({
    data,
    time: new Date()
  })
  buffer.entries = buffer.entries.slice(-7500)
  // console.log(buffer.entries.length)
}

/**
 * 
 * @param {function} $_ current language-aware translator function
 * @param {Number} id current message id
 * @param {Array} params list of variables for formatting
 * 
 * @returns {String} translated, parameterized text
 */
export default function getLogText($_, msgtext, id = 0, params = [], zonesnames) {

  const messages = {

    // TBD there may be a message id which will just be spit out in english
    0: msgtext,

    // static message types (actual text may be coming from the database, TBD)
    1: $_('User logged in'),
    2011: $_('$0::Execute').replace('$0::', params + ' ')
  }

  if (id in messages) {
    msgtext = messages[id]
  } else if (params && Array.isArray(params)) {
    msgtext = FormatText(msgtext, params)
  }
  else if (zonesnames != '') {
    msgtext = msgtext.replace('$z', zonesnames + ' ')
  }

  // if (zonesnames != '') {
  //   msgtext += ' for: ' + zonesnames
  // }

  return msgtext
}

const FormatText = (msgtext, params) => {
  // const params = options.params || []
  for (let [ i, param ] of params.entries()) {
    const r = new RegExp(`\\$${i}`)
    if(msgtext.match(r)) {
      msgtext = msgtext.replace(r, param)
    } else {
      msgtext = msgtext.replace('%s', param)
    }      
  }
  return msgtext
}
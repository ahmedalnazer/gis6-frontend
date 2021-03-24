
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
  } else if (params) {
    msgtext = msgtext.replace('$0::', params + ' ')
  }

  if (zonesnames != '') {
    msgtext += ' for: ' + zonesnames
  }
  return msgtext

  // // list of all available messages
  // const messages = {

  //   // TBD there may be a message id which will just be spit out in english
  //   0: params[0],

  //   // static message types (actual text may be coming from the database, TBD)
  //   1: $_('User logged in'),
  //   2: $_('User %s logged out', { params })
  // }


  // return messages[id]

}



// export default function getLogText($_, id = 0, params = [], zones = []) {
//   const formatted = [ 1, 2, 3 ]
//   if(formatted.includes(id)) {
//   return formatters[id]($_, params, zones)
//   }
//   // list of all available messages
//   const messages = {
//   // TBD there may be a message id which will just be spit out in english
//   0: params[0],
//   // static message types (actual text may be coming from the database, TBD)
//   1: $_('User logged in'),
//   2: $_('User $0 logged out', { params })
//   }
//   return messages[id]
//  }
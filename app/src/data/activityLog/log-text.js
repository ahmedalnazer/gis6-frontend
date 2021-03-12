
/**
 * 
 * @param {function} $_ current language-aware translator function
 * @param {Number} id current message id
 * @param {Array} params list of variables for formatting
 * 
 * @returns {String} translated, parameterized text
 */
export default function getLogText($_, id = 0, params = []) {

  // list of all available messages
  const messages = {

    // TBD there may be a message id which will just be spit out in english
    0: params[0],

    // static message types (actual text may be coming from the database, TBD)
    1: $_('User logged in'),
    2: $_('User %s logged out', { params })
  }


  return messages[id]

}
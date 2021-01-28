
/**
 * Quick/easy way to get a random id (e.g. for arbitrary keyed each blocks)
 * @param {number} length - length of the id (default is 12)
 */
export function getId(length = 12) {
  var charset = "0123456789abcdefghijklmnopqrstuvwxyz".match(/./g)
  var text = ""
  for (var i = 0; i < length; i++) text += charset[Math.floor(Math.random() * charset.length)]
  return text
}


const emailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/

/**
 * Validate email address
 * @param {string} email - email address to validate
 */
export const isEmail = email => emailRegex.test(email)


/**
 * Return id parsed as integer if possible
 * @param _id string or number to be tested and converted where possible
 */
export const id = _id => {
  const n = parseInt(_id)
  if(isNaN(n)) return _id
  return n
}
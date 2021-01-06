import uuid from 'shortid'

export const getId = () => {
  return uuid.generate()
}

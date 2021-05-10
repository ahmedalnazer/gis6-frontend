import { writable } from 'svelte/store'

const hotRunnerPrefs = writable({
  dataView: 'mini'
})

export const setHRPrefs = obj => {
  hotRunnerPrefs.update(cur => {
    const updated = { ...cur, ...obj }
    localStorage.setItem('hr-prefs', JSON.stringify(updated))
    return updated
  })
}

try {
  const cached = JSON.parse(localStorage.getItem('hr-prefs') || '{}')
  hotRunnerPrefs.set(cached)
} catch(e) {
  console.error(e)
}

export default hotRunnerPrefs

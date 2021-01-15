import { createBrowserHistory } from 'history'
import { writable } from 'svelte/store'


// actual browser history
const _history = createBrowserHistory()


// writable containing current location, updated whenever browser history changes
const history = writable(window.location)


let historyLog = []

// listen to history changes, update application state on change
_history.listen(({ location, action }) => {
  history.subscribe(x => {
    historyLog.push(x)
    historyLog = historyLog.slice(-100)
  })()
  history.set(location)
})


// convenient access to browser history methods
history.push = _history.push
history.go = _history.go
history.back = _history.back


/**
 * Go back (if possible) and track history changes
 */
export const goBack = () => {
  if(window.history.length > 0) {
    _history.back()
    historyLog.pop()
  } else {
    _history.push('/')
  }
}


function findLink(el) {
  if (el.tagName == 'A' && el.getAttribute('href')) {
    return el.getAttribute('href')
  } else if (el.parentElement) {
    return findLink(el.parentElement)
  } else {
    return null
  }
};


// hijack links and push to history instead of default page load where applicable
document.body.addEventListener('click', e => {
  const href = findLink(e.target)
  if(!href) return
  
  if(!e.metaKey && href) {

    if(href == '/' || !href.startsWith('http') && !href.startsWith('//')) {

      // prevent default behavior for local links
      e.preventDefault()
      _history.push(href)
      if(!href.includes('#')) {
        document.querySelector('.viewport').scrollTo(0, 0)
      }

      // replicate anchor link with delay to allow SPA to update DOM
      if(href.includes('#')) {
        setTimeout(() => {
          const id = href.split('#')[1]
          const tgt = document.getElementById(id)
          if(tgt) {
            tgt.scrollIntoView({
              behavior: 'smooth'
            })
          }
        }, 300)
      }
    }
  }
})


export default history

import { createBrowserHistory } from 'history'
import { writable } from 'svelte/store'


// actual browser history
const _history = createBrowserHistory()


// writable containing current location, updated whenever browser history changes
const history = writable(window.location)


// listen to history changes, update application state on change
_history.listen(({ location, action }) => {
  history.set(location)
})


// convenient access to browser history methods
history.push = _history.push
history.go = _history.go
history.back = _history.back


// hijack links and push to history instead of default page load where applicable
document.body.addEventListener('click', e => {
  const href = e.target.getAttribute('href')
  if(!e.metaKey && href) {

    if(!href.startsWith('http') && !href.startsWith('//')) {

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

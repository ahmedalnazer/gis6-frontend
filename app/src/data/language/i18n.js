import { derived } from 'svelte/store'
import current from './current'

import de from './translations/de.json'
import fr from './translations/fr.json'

const _ = derived([ current ], ([ $current ]) => {
  return (text, options) => {
    options = options || {}
    
    // if($current == 'en-US') return text
    let datasets = {
      'de-DE': de,
      'fr-FR': fr
    }

    let translation = text + ''

    if(datasets[$current] && datasets[$current][text]) {
      translation = datasets[$current][text]
    }

    const params = options.params || []
    for (let [ i, param ] of params.entries()) {
      const r = new RegExp(`\\$${i}`)
      if(translation.match(r)) {
        translation = translation.replace(r, param)
      } else {
        translation = translation.replace('%s', param)
      }      
    }
    return translation
  }
})

export default _

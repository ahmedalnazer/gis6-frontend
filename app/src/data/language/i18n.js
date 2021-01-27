import { derived } from 'svelte/store'
import current from './current'

import de from './translations/de.json'
import fr from './translations/fr.json'

const _ = derived([ current ], ([ $current ]) => {
  return (text, options) => {
    options = options || {}
    if($current == 'en-US') return text
    let datasets = {
      'de-DE': de,
      'fr-FR': fr
    }
    if(datasets[$current] && datasets[$current][text]) {
      return datasets[$current][text]
    } else {
      return text
    }
  }
})

export default _

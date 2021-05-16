import { derived } from 'svelte/store'
import current from './current'
import convert from './units'
import { rawZones } from 'data/zones'

import de from './translations/de.json'
import fr from './translations/fr.json'

const _ = derived([ current, convert, rawZones ], ([ $current, $convert, $zones ]) => {
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
      if(param.type) {
        param = $convert(param)
      }
      if(translation.match(r)) {
        translation = translation.replace(r, param)
      } else {
        translation = translation.replace('%s', param)
      }
    }

    const zoneIds = options.zones || []
    if(zoneIds.length) {
      const zoneList = $zones.filter(x => zoneIds.includes(x.number))
      if(zoneList.length) {
        let zoneLabel = zoneList[0].name
        if (zoneList.length > 1) {
          zoneLabel = zoneList.map(x => x.name).join(', ')
        }
        translation = translation.replace(/\$z/i, zoneLabel)
      }
    }

    return translation
  }
})

export default _

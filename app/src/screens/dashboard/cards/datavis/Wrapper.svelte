<script>
  import Card from '../Card.svelte'
  import { Select } from 'components'
  import _ from 'data/language'
  import Line from './Line'
  import MiniController from './Mini'


  let selectedVis = 'mini'

  let options = [
    { id: 'ez',
      name: $_('EZ Screen'),
      title: $_('Zone Table (EZ Screen)'),
      url: '/easy-screen'
    },
    { id: 'mini',
      name: $_('Minicontroller'),
      url: '/mini-controller'
    },
    { id: 'plot',
      name: $_('Line'),
      title: $_('Line Graph'),
    }
  ]

  const components = {
    mini: MiniController,
  }

  $: Rendered = components[selectedVis]

</script>

<Card span=4 >
  <Select isSearchable={false} selectedItemLabel='title'  bind:value={selectedVis} options={options} />
  <Rendered />
</Card>

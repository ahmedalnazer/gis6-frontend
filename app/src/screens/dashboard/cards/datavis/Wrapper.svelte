<script>
  import Card from '../Card.svelte'
  import { BareSelect } from 'components'
  import _ from 'data/language'
  import Line from './Line'
  import MiniController from './Mini'
  import EZ from './EZ'
  import history from 'router/history'
  import hotRunnerPrefs, { setHRPrefs } from 'data/hot-runner/preferences'
  import zones from 'data/zones'
  import { activeGroup } from 'data/groups'

  $: activeZones = $activeGroup ? $zones.filter(x => x.groups && x.groups.includes($activeGroup)) : $zones

  let selectedVis = $hotRunnerPrefs.dataView

  $: {
    if(selectedVis) {
      setHRPrefs({ dataView: selectedVis })
    }
  }

  let options = [
    { id: 'ez',
      name: $_('EZ Screen'),
      url: '/easy-screen'
    },
    { id: 'mini',
      name: $_('Minicontroller'),
      url: '/mini-controller'
    },
    { id: 'line',
      name: $_('Line Graph'),
      url: '/charts/line-plot'
    }
  ]

  const components = {
    mini: MiniController,
    ez: EZ,
    line: Line
  }

  $: Rendered = components[selectedVis]

  const go = () => {
    const op = options.find(x => selectedVis == x.id)
    history.push(op.url)
  }

</script>

<Card span=4 >
  <div class='wrap'>
    <div class='header'>
      <BareSelect small selectedItemLabel='title'  bind:value={selectedVis} options={options} />
      <div class='button' on:click={go}>{$_('View Details')}</div>
    </div>
    <div class='body' on:click={go}>
      <svelte:component zones={activeZones} this={Rendered} />
    </div>
  </div>
</Card>

<style lang="scss">
  .wrap {
    padding: 12px;
  }
  .header {
    margin-bottom: 20px;
    display: flex;
    justify-content: space-between;
  }
  .body {
    margin: 0 -4px;
    padding: 4px;
    max-height: 640px;
    overflow: auto;
  }
</style>

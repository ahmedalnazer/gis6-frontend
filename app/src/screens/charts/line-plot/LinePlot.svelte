<script>
  import { onDestroy } from 'svelte'
  import GroupSelector from "components/GroupSelector.svelte"
  import { Select, CheckBox, Icon } from 'components'
  import Screen from 'layout/Screen.svelte'
  import Chart from 'components/charting/Chart.svelte'
  import ZoneTasks from "components/taskbars/ZoneTasks.svelte"
  import Settings from './LinePlotSettings.svelte'
  import _ from 'data/language'
  import { colors } from 'data/charting/line-utils'
  import zones, { activeZones, selectedZones, toggleZones } from 'data/zones'
  import { activeGroup } from "data/groups"
  import { default as _convert } from 'data/language/units'

  let propertyOptions = [
    { id: 'actual_temp', name: $_('Actual Temperature'), type: 'temperature' },
    { id: 'deviation', name: $_('Deviation'), type: 'temperature' },
    { id: 'actual_current', name: $_('Heater Current'), type: 'current' },
    { id: 'manual_sp', name: $_('Manual % Setpoint'), type: 'percent' },
    { id: 'actual_percent', name: $_('Percent Output'), type: 'percent' },
    { id: 'temp_sp', name: $_('Temperature Setpoint'), type: 'temperature' },
  ]

  const convert = (type, value) => {
    const op = propertyOptions.find(x => x.id == type)
    if(op) {
      return $_convert({ type: op.type, value })
    }
    return ''
  }

  let params = {
    1: 'actual_temp',
    2: '',
    3: '',
    4: ''
  }
  $: properties = [ params[1], params[2], params[3], params[4] ]

  let mode = 'pan'

  $: getOptions = value => {
    let ops = [ { id: '', name: $_('None') } ]
    const selected = propertyOptions.find(x => x.id == value)
    if(selected) ops.push(selected)
    return ops.concat(propertyOptions.filter(x => !properties.includes(x.id)))
  }

  let stats = {}

  let showSettings = false

  let scales = {}

  $: availableZones = $activeGroup
    ? $zones.filter(x => x.groups && x.groups.includes($activeGroup))
    : $zones

  $: rendered = $activeZones.map(x => x.number)

  $: all = $selectedZones.length > 0 && $selectedZones.length == availableZones.length

  const toggleAll = () => {
    if($selectedZones.length) {
      selectedZones.set([])
    } else {
      selectedZones.set(availableZones.map(x => x.id))
    }
  }

  let initialized = false
  $: {
    if(!$selectedZones.filter(x => !!x).length && $zones.length && $zones[0].id && !initialized) {
      selectedZones.set([ $zones[0] && $zones[0].id ])
      initialized = true
    }
  }

  const unsubActive = activeGroup.subscribe(g => {
    if($zones[0]) {
      if(g) {
        selectedZones.set($zones.filter(x => x.groups && x.groups.includes(g)).map(x => x.id))
      } else {
        selectedZones.set($zones.map(x => x.id))
      }
      initialized = true
    }
  })

  let paused, resetPosition, moved
  let mark

  const reset = () => {
    resetPosition()
    setMode('pan')
  }

  $: {
    if(!paused) mode = 'pan'
  }

  const setMode = m => {
    if(mode == m) m = 'pan'
    paused = m != 'pan'
    mode = m
  }

  onDestroy(() => {
    unsubActive()
  })
</script>

<Screen back='/hot-runner' group='zones' scroll>
  <div slot="tasks">
    <ZoneTasks />
  </div>

  <div slot="header" class="tools" >
    <div class='set'>
      <Icon icon='mark-time' color='var(--primary)' on:click={mark} />
      <Icon icon={paused ? 'play' : 'pause'} color='var(--primary)' on:click={() => paused = !paused} />
    </div>
    <div class='set'>
      <div class='reset'>
        <Icon icon='undo' color={moved ? 'var(--primary)' : 'var(--gray)'} on:click={reset} />
      </div>
      <div class='tool' class:active={mode == 'inspect'}>
        <Icon icon='view' color='var(--primary)' on:click={() => setMode('inspect')}/>
      </div>
    </div>
    <div class='set'>
      <Icon icon='settings' color='var(--primary)' on:click={() => showSettings = true}/>
    </div>  
  </div>

  <div class='wrapper'>
    
    <Chart type='line' 
      bind:stats 
      bind:moved
      bind:paused
      bind:resetPosition
      bind:mark
      zones={rendered} 
      {...{ properties, propertyOptions, colors, scales, mode }}  
    />

    <div class='options'>
      <div class='properties'>
        {#each [ 1, 2, 3, 4 ] as n}
          <div class='selector'>
            <Select bind:value={params[n]} options={getOptions(params[n])}/>
            {#if params[n] && stats.avg}
              <div class='average' style='opacity: {isNaN(stats.avg[params[n]]) ? 0 : 1}'>
                <div class='color' style='background:{colors[n]}' />
                {$_('Average')}
                <span style='color:{colors[n]}'>{convert(params[n], stats.avg[params[n]])}</span>
              </div>
            {/if}
          </div>
        {/each}
      </div>

      <div class='zone-selections'>
        <div class='selection-header'>
          <h2>Display</h2>
          <CheckBox label={$_('All')} checked={all} minus={$selectedZones.length && !all} on:change={toggleAll}/>
        </div>
        <div class='available-zones'>
          <div class='zone-grid'>
            {#each availableZones as z}
            <CheckBox label={z.name} checked={$selectedZones.includes(z.id)} on:change={() => toggleZones(z)}/>
          {/each}
          </div>
        </div>
      </div>

      <div class='footer-groups'>
        <GroupSelector />
      </div>

    </div>
  </div>
</Screen>

{#if showSettings}
  <Settings onClose={() => showSettings = false} onSubmit={s => scales = s} {...{ stats, scales }} />
{/if}

<style lang="scss">
  .wrapper {
    height: 100%;
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .tools {
    display: flex;
    justify-content: flex-end;
    flex: 1;
    align-items: flex-end;
    padding-right: 8px;
    :global(svg) {
      height: 20px;
      width: 20px;
      margin: 8px;
    }
    .set {
      margin-left: 40px;
      display: flex;
    }
    .tool {
      margin-right: 16px;
      display: flex;
      align-items: center;
      padding: 8px;
      :global(svg) {
        height: 24px;
        width: 24px;
        padding: 0;
        margin: 0;
      }
    }
    .tool.active {
      background: var(--gray);
      border-radius: 50%;
    }
  }

  .reset {
    transform: rotate(135deg) scaleX(-1);
  }

  .properties {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
  }

  .options {
    margin-top: 40px;
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .selection-header {
    margin-top: 24px;
    display: flex;
    align-items: center;
    h2 {
      margin-right: 32px;
    }
  }

  .zone-selections {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .available-zones {
    flex: 1;
    flex-basis: 0;
    overflow: auto;
    border: 1px solid var(--gray);
    padding: 20px;
  }

  .zone-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
  }

  .average {
    display: flex;
    margin-top: 12px;
    .color {
      height: 20px;
      width: 20px;
      margin-right: 16px;
    }
    span {
      margin-left: 16px;
    }
  }

  .footer-groups {
    position: relative;
    top: 40px;
    left: -40px;
  }
</style>
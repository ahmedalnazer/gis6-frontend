<script>
  import _ from 'data/language'
  import { BareSelect } from 'components'
  import history, { goBack } from 'router/history'
  import IconBackArrow from 'style/images/icon_backarrow.svelte'
  import { onMount } from 'svelte'

  export let dashboard = false
  export let title = ''
  export let group = null
  export let scroll = true
  let backUrl = ''
  export { backUrl as back }

  let tasksEmpty

  const groups = {
    zones: {
      ez: {
        name: $_('EZ Screen'),
        title: $_('Zone Table (EZ Screen)'),
        url: '/easy-screen'
      },
      mini: {
        name: $_('Minicontroller'),
        url: '/mini-controller'
      },
      plot: {
        name: $_('Line'),
        title: $_('Line Graph'),
        url: '/charts/line-plot'
      }
    }
  }

  let options = []
  let selectedScreen = ''
  let targetUrl = $history.pathname
  $: options = group && groups[group] && Object.keys(groups[group]).map(key => {
    return { id: key, ...groups[group][key] }
  }) || []


  $: {
    if(group && groups[group]) {

      const selectedOption = selectedScreen && options.find(x => x.id == selectedScreen)
      if(selectedOption && targetUrl != selectedOption.url) {
        targetUrl = selectedOption.url
        history.push(targetUrl)
      }
    } else {
      options = []
      selectedScreen = ''
      targetUrl = ''
    }
  }

  const back = () => {
    if(backUrl) {
      history.push(backUrl)
    } else {
      goBack()
    }
  }

  onMount(() => {
    if(options.length) {
      const selectedOption = options.find(x => x.url == $history.pathname)
      selectedScreen = selectedOption ? selectedOption.id : ''
    }
  })


</script>


<div {...$$restProps} class:hide-tasks={tasksEmpty} class:dashboard class="viewport {$$restProps.class || ''}">
  <div class='tasks'>
    <slot name='tasks'>
      <div bind:this={tasksEmpty} />
    </slot>
  </div>
  {#if !dashboard}
    <div class='screen-header'>
      <div class='back' on:click={back}>
        <IconBackArrow width="30" height="30" />
      </div>
      {#if options.length}
        <BareSelect isSearchable={false} bind:value={selectedScreen} options={options} />
      {:else}
        <h1>{title}</h1>
      {/if}
      <slot name='header' />
    </div>
  {/if}
  <main class="screen-body" class:scroll>
    <slot />
  </main>
</div>

{#if tasksEmpty}
  <style>
    .modal {
      top: 120px !important;
    }
    .notifications {
      top: 120px !important;
    }
  </style>
{/if}


<style lang="scss">
  h1 {
    font-size: 26px;
    padding: 0;
    margin: 0;
  }
  .screen-header {
    display: flex;
    padding: 32px;
    align-items: flex-start;
    // z-index: 3;   // Commented
  }

  .back {
    margin-right: 16px;
    margin-left: 4px;
    :global(svg path) {
      fill: var(--primary);
    }
  }

  .screen-body {
    padding: 40px;
    display: flex;
    flex-direction: column;
    &.scroll {
      overflow: auto;
    }
  }

  .screen-header + .screen-body {
    padding-top: 20px;
  }

  .tasks {
    background-color: #364860;
    padding: 10px 10px 10px 10px;
    display: flex;
    align-items: center;
    padding: 32px 40px;

    > :global(*) {
      width: 100%;
    }

    :global(.button:not(.ignore-task-styles)) {
      background: linear-gradient(0deg, #3c4f69, #4f6483);
      color: #eeeff4;
      padding: 40px;
      justify-content: center;
      box-sizing: border-box;
      border: none;
      outline: none;
      user-select: none;
      font-weight: 600;
      font-size: 16px;
      -webkit-appearance: none;
      cursor: pointer;
      box-shadow: 4px 4px 8px rgba(0, 0, 0, .3);
    }
    :global(.button:not(.ignore-task-styles):active, .button.pressed:not(.ignore-task-styles)) {
      background: linear-gradient(180deg, #161E29 0%, #1D2734 7.81%, #212F41 100%) !important;
      box-shadow: none !important;
    }
  }
  .viewport.hide-tasks {
    .tasks {
      display: none;
    }
  }

  .dashboard {
    background: #EEEFF4;
  }

  .screen-header :global(.select) {
    min-width: 200px;
    position: relative;
    border: 0;
    --border: 0;
    --background: white;
    --padding: 0px 8px;
    --inputFontSize: 26px;
    --height: 32px;
  }
  .screen-header :global(.select .selectedItem) {
    font-size: 26px;
    line-height: 26px !important;
    height: auto !important;
    font-weight: 600;
    padding-right: 48px;
  }

  .screen-header :global(.select .selectContainer) {
    padding: 0;
  }

  .screen-header :global(.select .selectContainer .indicator) {
    display: none;
  }
</style>

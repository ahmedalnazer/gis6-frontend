<script>
  import Header from './Header'
  import Footer from './Footer'
  import { goBack } from 'router/history'
  import IconBackArrow from 'style/images/icon_backarrow'

  export let hideHeader = false
  export let hideFooter = false
  export let dashboard = false
  export let title = ''

  let tasksEmpty

  $: {
    console.log(tasksEmpty)
  }

</script>


<div {...$$restProps} class:hide-tasks={tasksEmpty} class="viewport {$$restProps.class || ''}">
  {#if !hideHeader}
    <Header />
  {/if}
  {#if !dashboard}
    <div class='screen-header'>
      <div class='back' on:click={goBack}>
        <IconBackArrow width="45" height="45" />
      </div>
      <h1>{title}</h1>
    </div>
  {/if}
  <div class='tasks'>
    <slot name='tasks'>
      <div bind:this={tasksEmpty} />
    </slot>
  </div>
  <main class="screen-body">
    <slot />
  </main>
  {#if !hideFooter}
    <Footer />
  {/if}
</div>


<style lang="scss">
  .screen-header {
    display: flex;
    padding: 16px 32px;
    align-items: center;
  }

  .back {
    margin-right: 32px;
    :global(svg path) {
      fill: var(--primary);
    }
  }

  .screen-body {
    padding: 40px;
    z-index: 2;
    overflow: auto;
  }

  .screen-header + .screen-body {
    padding-top: 16px;
  }

  .tasks {
    background-color: #364860;
    padding: 10px 10px 10px 10px;
    display: flex;
    align-items: center;
    padding: 32px 40px;

    :global(.button) {
      background: linear-gradient(0deg, #3c4f69, #4f6483);
      color: #eeeff4;
      padding: 40px;
      justify-content: center;
      box-sizing: border-box;
      border: none;
      outline: none;
      user-select: none;
      -webkit-appearance: none;
      cursor: pointer;
      box-shadow: 4px 4px 8px rgba(0, 0, 0, .3);
    }
  }
  .viewport.hide-tasks {
    .tasks {
      display: none;
    }
  }
</style>

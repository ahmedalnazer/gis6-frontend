<script>
  import Header from './Header'
  import Footer from './Footer'
  import { goBack } from 'router/history'

  export let hideHeader = false
  export let hideFooter = false
  export let dashboard = false
  export let title = ''

</script>


<div {...$$restProps} class="viewport {$$restProps.class || ''}">
  {#if !hideHeader}
    <Header />
  {/if}
  {#if !dashboard}
    <div class='screen-header'>
      <div class='back' on:click={goBack}>BACK</div><h1>{title}</h1>
    </div>
  {/if}
  <main class="screen-body">
    <slot />
  </main>
  {#if !hideFooter}
    <Footer />
  {/if}
</div>


<style>
  .screen-header {
    display: flex;
    padding: 16px 32px;
    align-items: center;
  }

  .back {
    margin-right: 32px;
  }

  .screen-body {
    padding: 32px;
    z-index: 2;
    overflow: auto;
  }

  .screen-header + .screen-body {
    padding-top: 16px;
  }
</style>

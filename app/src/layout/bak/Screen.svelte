<script>
  import Header from './Header'
  import Footer from './Footer'

  export let hideHeader = false
  export let hideFooter = false

</script>


<div {...$$restProps} class="viewport {$$restProps.class || ''}">
  {#if !hideHeader}
    <Header />
  {/if}
  <main class="screen-body">
    <slot />
  </main>
  {#if !hideFooter}
    <Footer />
  {/if}
</div>

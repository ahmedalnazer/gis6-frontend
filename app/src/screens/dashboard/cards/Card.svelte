<script>
  export let link
</script>

<a href={link} class='card'>
  <div class='body'>
    <slot />
  </div>
  <div class='footer'>
    {#if link}
      <img src='/images/icons/expand.svg' />
    {/if}
  </div>
</a>

<style>
  a {
    color: inherit
  }
</style>
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
  a.card {
    color: inherit;
    display: flex;
    flex-direction: column;
  }
  .body {
    flex: 1;
  }
  .footer {
    display: flex;
    justify-content: flex-end;
  }
</style>

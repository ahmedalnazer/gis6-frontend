<script>
  export let link = undefined
  export let span = 1
  export let footerIcon = undefined
</script>

<a href={link} class='card' style='grid-column: span {span};'>
  <div class='body'>
    <slot />
  </div>
  <div class='footer'>
    {#if footerIcon}
      <img src='/images/icons/expand.svg' alt='expand'/>
    {/if}
  </div>
</a>

<style>
  a.card {
    color: inherit;
    display: flex;
    flex-direction: column;
    padding: 16px;
    min-height: 160px;
  }
  a :global(h2) {
    padding: 0;
    margin: 0;
    margin-bottom: 10px;
    font-size: 20px;
  }
  a :global(p) {
    font-size: 14px;
    padding: 0;
    margin: 0;
    padding-bottom: 10px;
  }
  .body {
    flex: 1;
  }
  .footer {
    display: flex;
    justify-content: flex-end;
  }
</style>

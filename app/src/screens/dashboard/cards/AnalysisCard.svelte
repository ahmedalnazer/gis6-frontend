<script>
  import Card from './Card.svelte'
  import _ from 'data/language'
  import language from 'data/language/current'
  import { Progress } from 'components'

  export let analysis
  export let link
  export let title

</script>

<Card {link}>
  <h2>{title}</h2>
  {#if $analysis && $analysis.status != 'inactive'}
    <p class='muted'>{$_('Started')} {new Date().toLocaleString($language, { dateStyle: 'short', timeStyle: 'short' })}</p>
    <div class='progress'>
      {#if $analysis.status == 'complete'}
        <p class='muted'>{$_('Report available')}</p>
      {:else}
        <Progress height='14' current={$analysis.progress} />
      {/if}
    </div>
  {/if}
</Card>

<style>
  .progress {
    margin-top: 10px;
  }
</style>
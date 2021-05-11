<script>
  import Card from './Card.svelte'
  import _ from 'data/language'
  import { Icon } from 'components'
  import Summary from '../hot-runner/Summary.svelte'
  import { enableHomeEdit } from 'data/user/cardpref'

</script>

<Card link='/hot-runner' footerIcon={false} cardEnabled={$enableHomeEdit} bigCard={$enableHomeEdit}>
  {#if $enableHomeEdit}
    <div class="card-edit-placeholder big-card">
      <h2 class="title">{$_('Hot Runner')}</h2>
    </div>
  {:else}
    <div class="sectionHeader">
      <div class='icon'>
        <Icon icon="checkmarkcircle" color="var(--green)" size="1em" />
      </div>
      <div>{$_('Hot Runner')}</div>
    </div>
    <div class='zoneContainer'>
      <Summary />
    </div>
  {/if}
</Card>


<style lang="scss">
  .center {
    margin: auto;
    width: 80%;
    padding: 10px;
  }
  .sectionHeader {
    border-top: 7px solid var(--green);
    display: flex;
    align-items: center;
    margin: -16px;
    margin-bottom: 0;
    padding: 16px;
    font-size: 20px;
    font-weight: 600;
    letter-spacing: 0;
    line-height: 27px;
  }
  .icon {
    margin-right: 10px;
    margin-top: 6px;
  }
  .zoneContainer {
    padding-top: 20px;
    padding-bottom: 13px;
    display: grid;
    grid-template-columns: 1.2fr 1fr;
    grid-gap: 25px;
    :global(.zoneTemp) {
      font-size: 40px;
      letter-spacing: 0;
      line-height: 55px;
    }
    :global(.zoneInfo) {
      font-size: 16px;
      font-weight: bold;
      letter-spacing: 0;
      line-height: 22px;
      padding-bottom: 10px;
      text-transform: uppercase;
    }
    :global(.temp) {
      margin-bottom: 0px;
    }
    :global(.heaters) {
      order: 0;
    }
    :global(.max) {
      order: 1;
    }
    :global(.faults) {
      order: 2;
    }
    :global(.min) {
      order: 3;
    }
  }
</style>

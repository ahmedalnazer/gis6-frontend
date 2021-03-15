<script>
  import _ from 'data/language'
  import { Icon } from 'components'

  export let type = ''

</script>

{#if type == 'alert'}
  <div class="chip  chip-alert">
    <Icon icon='warning' color='white' />
    <span class="chip-label">Alert</span>
  </div>
{:else if type == 'warning'}
  <div class="chip chip-warning">
    <Icon icon='warning' color='white' />
    <span class="chip-label">Warning</span>
  </div>
{:else}
  <div class="chip chip-default">
    <!-- <Icon icon='warning' color='white' /> -->
    <span class="chip-label">Change</span>
  </div>
{/if}

<style lang="scss">

    .chip {
      display: inline-block;
      padding: 0 25px;
      height: 30px;
      font-size: 16px;
      line-height: 30px;
      // width: 101px;
      border-radius: 14.5px;
    }

    .chip-alert {
      background-color: var(--danger);
      color: #FFFFFF;
    }

    .chip-warning {
      background-color: #EDA011;
      color: #FFFFFF;
    }

    .chip-default {
      background-color: #EEEFF4;
    }

    .chip-label {
      height: 18px;
      width: 33px;
      font-size: 14px;
      font-weight: 600;
      letter-spacing: 0;
      line-height: 18px;
      text-align: center;
      padding-left: 5px;
    }

</style>
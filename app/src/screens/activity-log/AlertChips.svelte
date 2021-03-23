<script>
  import _ from 'data/language'
  import { Icon } from 'components'

  export let type = ''

</script>

{#if type == 'error'}
  <div class="chip  chip-alert">
    <div class="chip-icon"><Icon icon='warning' color='white' /></div>
    <div class="chip-label">Alert</div>
  </div>
{:else if type == 'warning'}
  <div class="chip chip-warning">
    <div class="chip-icon"><Icon icon='information' color='white' /></div>
    <div class="chip-label">Warning</div>
  </div>
{:else if type == 'alert1'}
  <div class="chip chip-alert-1">
    <div class="chip-icon"><Icon icon='warning' color='white' /></div>
    <div class="chip-label">Alert</div>
  </div>
{:else if type == 'warning1'}
  <div class="chip chip-warning-1">
    <div class="chip-icon"><Icon icon='information' color='white' /></div>
    <div class="chip-label">Warning</div>
  </div>
{:else}
  <div class="chip chip-default">
    <div class="chip-icon">&nbsp;&nbsp;&nbsp;&nbsp;</div>
    <div class="chip-label">Change</div>
  </div>
{/if}

<style lang="scss">

    .chip {
      display: inline-block;
      padding: 0px 10px 0px 10px;
      height: 30px;
      min-width: 110px;
      // min-width: 140px;
      font-size: 16px;
      line-height: 30px;
      border-radius: 14.5px;
      font-weight: 600;
      letter-spacing: 0;
      text-align: center;
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

    .chip-alert-1 {
      background-color: #A2A4A8;  
      color: #FFFFFF;
    }

    .chip-warning-1 {
      background-color: #A2A4A8;  
      color: #FFFFFF;
    }

    .chip-icon {
      float: left;  
    }

    .chip-label {
      // height: 18px;
      // width: 33px;
      font-size: 14px;
      font-weight: 600;
      // letter-spacing: 0;
      // // // line-height: 18px;
      text-align: center;
      padding-left: 5px;
      // border: 1px solid hotpink;
      vertical-align: middle;
      float: left;
    }

</style>
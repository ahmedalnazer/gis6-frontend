<script>
  import _ from "data/language"
  import { toggleSetpoint } from 'data/setpoint'

  let on, off, standby, boost
</script>


<div class='buttons'>
  <div class='button'>
    <div class='icon circle' />
    {$_('Off')}
  </div>
  <div class='button'>
    <div class='icon off' />
    {$_('On')}
  </div>
  <div class='button'>
    <div class='icon down' />
    {$_('Standby')}
  </div>
  <div class='button'>
    <div class='icon up' />
    {$_('Boost')}
  </div>

  <div class='button setpoint' on:click={toggleSetpoint}>
    <div class='icon setpoint' />
    {$_('Setpoint')}
  </div>
</div>




<style lang='scss'>
  $white: #F5F6F9;
  .buttons {
    display: flex;
    width: 100%;
  }
  .buttons .button {
    padding: 16px;
    min-width: 0;
    text-transform: uppercase;
    display: flex;
    flex-direction: column;
    align-items: center;

    height: 100px;
    width: 120px;
    border-radius: 4px;
    margin-right: 16px;
    &.setpoint {
      margin-left: auto;
      margin-right: 0;
    }
  }
  .icon {
    background: $white;
    border-color: $white;
    width: 24px;
    height: 24px;
    margin-bottom: 16px;
    margin-top: 8px;
  }
  .circle {
    border-radius: 50%;
  }
  .off {
    width: 12px;
  }

</style>
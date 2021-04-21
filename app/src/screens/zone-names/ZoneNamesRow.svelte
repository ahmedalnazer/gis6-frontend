<script>
  import { CheckBox } from 'components'
  import _ from 'data/language'
  // import { activeSetpointEditor } from 'data/setpoint'
  // import { selectedZones } from 'data/zones'
  import { createEventDispatcher } from 'svelte'

  export let zone
  export let group = null
  export let active

  const dispatch = createEventDispatcher()

</script>

<div class='zone-name-grid rb-box zone-box border' class:active data-id={zone.id} data-group={group && group.id}>
  <div>
    <CheckBox checked={active} /> {zone.id}
  </div>
  <div>
    {zone.name}
  </div>
</div>

<style lang="scss">
  .zone-name-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      height: 70px;
      align-content: center;
      padding: 32px 17px 17px 17px; 
      border: 1px solid var(--grayBorder);
      margin-bottom: -1px;
  }

  .active {
    background: var(--pale);
  }

  .warning {
    background: var(--warning)
  }

  .error {
    background: var(--danger)
  }

  .circle {
    background: white;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    position: relative;
    bottom: 8px;
  }

  @keyframes boostAnimation {
    0% {bottom: -100%}
    100% {bottom: 0%}
  }

  .animated {
    display:flex;
    flex-direction: column;
    margin: 2px;
    position: relative;
    overflow: hidden;
    :global(svg) {
      width: 8px;
      height: 8px;
    }
    .gradient-overlay  {
      animation: boostAnimation 1s infinite linear;
      background: linear-gradient(var(--blue), transparent, transparent, var(--blue)) repeat;
      background-size: 100% 50%;
      background-repeat: repeat;
      background-position: 0, 0;
      position:absolute;
      height: 200%;
      width: 100%;
      left: 0;
      bottom: 0%
    }
  }

  .standby.animated {
    transform: rotate(180deg)
  }

  .settings {
    display: flex;
  }

</style>
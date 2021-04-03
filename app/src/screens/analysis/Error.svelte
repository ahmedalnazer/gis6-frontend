<script>
  import { Icon } from "components"
  import { error_types } from "data/analysis/core"
  import zones, { getAlarms } from 'data/zones'

  export let error

  let alarms
  let zone
  let error_type

  $: list = error.zones_list && JSON.parse(error.zones_list)
  $: zone = error.zone || list && $zones.find(x => x.number == list[0])

  $: {
    if(error.message_content) {
      let temp = 0
      let power = 0    
      for(let a of error.message_content.arguments) {
        if(a.type == 'temperatureAlarm') temp = a.value
        if(a.type == 'powerAlarm') power = a.value
      }
      alarms = getAlarms(power, temp)
      for(let [ key, value ] of Object.entries(alarms)) {
        if(value) error_type = key
      }
    }
  }

  $: console.log(error_type)

  // $: details = error_types[error.type]
  $: details = error.type ? error_types[error.type] : error_types[error_type] || {}
</script>

{#if zone && details.name}
  <div class="error">
    <div class="name">
      {zone.name}
    </div>
    <div class="thumb">
      <img src={details.icon} alt={details.name} />
    </div>
    <div class="desciption">
      <div class="icon">
        <Icon icon="warning" color="var(--danger)" />
      </div>
      <div class="details">
        <div class="error-name">
          {details.name}
        </div>
        <div class="description">
          {details.description}
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .error {
    display: grid;
    grid-template-columns: 150px 100px 1fr;
    /* border-bottom: 1px solid #333333; */
    border-bottom: 1px solid #A2A4A8;
    border-left: 1px solid #A2A4A8;
    border-right: 1px solid #A2A4A8;
    padding: 24px 40px 24px 40px;
  }

  .name {
    font-size: 16px;
    font-weight: 600;
    line-height: 22px;
  }
  .details {
    color: #b32024;
    font-size: 16px;
    font-weight: 600;
    line-height: 22px;
    letter-spacing: 0;
    padding-bottom: 5px;
  }

  .description {
    color: #b32024;
    font-size: 16px;
    font-weight: 600;
    line-height: 22px;
    letter-spacing: 0;
    padding-top: 5px;
  }

  .icon {
    float: left;
    padding: 8px;
    height: 100%;
    margin-top: -4px;
  }
</style>

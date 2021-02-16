<script>
  import { Icon } from 'components'
  import { error_types } from 'data/analysis/core'
  export let error

  $: details = error_types[error.type]

</script>

<div class='error'>
  <div class='name'>
    {error.zone.name}
  </div>
  <div class='thumb'>
    <img src="{details.icon}" alt="{details.name}" />
  </div>
  <div class='desciption'>
    <div class='icon'>
      <Icon icon='warning' color='var(--danger)' />
    </div>
    <div class='details'>
      <div class='error-name'>
        {details.name}
      </div>
      <div class='description'>
        {details.description}
      </div>
    </div>
  </div>
</div>

<style>
  .error {
    display: grid;
    grid-template-columns: 100px 100px 1fr;
    border-bottom: 1px solid #333333;
    padding: 10px;
  }

  .details {
    color: #B32024;
  }

  .icon {
    float: left;
    padding: 8px;
  }
</style>
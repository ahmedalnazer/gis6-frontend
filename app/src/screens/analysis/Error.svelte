<script>
  import { Icon } from "components";
  import { error_types } from "data/analysis/core";
  export let error;

  $: details = error_types[error.type];
</script>

<div class="error">
  <div class="name">
    {error.zone.name}
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

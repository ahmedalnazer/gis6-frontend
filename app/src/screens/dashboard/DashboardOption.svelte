<script>
  import { Icon, CheckBox } from 'components'
  export let checked = true
  export let card = {}
</script>


<div class='item-row'>
  {#if card.editIcon}
    <div class='icon'>
      <Icon icon={card.editIcon} />
    </div>
  {/if}
  <div>
    <CheckBox
      label={card.title}
      bind:checked
      disabled={card.mandatory}
    />
    {#if card.description}
      <p>{card.description}</p>
    {/if}
  </div>
</div>

<style>
  p {
    margin-bottom: 10px;
    margin-top: -4px;
  }

  .item-row {
    display: flex;
    align-items: center;
  }

  .icon {
    border: 1px solid var(--gray);
    padding: 10px 30px;
    margin-right: 10px;
  }
</style>

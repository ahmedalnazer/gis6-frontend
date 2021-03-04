<script>
  import Select from 'svelte-select'
  export let options = []
  
  export let id = 'id'
  export let value
  export let label = ''
  export let display = false
  export let selectedLabel = ''
  export let selectedItemLabel = ''

  export let getLabel = l =>  l && l[label || 'name']
  export let getSelectionLabel = l => l && l[selectedItemLabel || label || 'name'] || getLabel(l)

  let selectedValue

  $: {
    selectedValue = options.find(x => x[id] == value)
  }

  $: selectedLabel = getLabel(selectedValue)

  const select = e => {
    value = e.detail[id]
    selectedValue = e.detail
  }
</script>

<div class='select-container'>
  {#if label}
    <label>{label}</label>
  {/if}
  {#if display}
    <div class='display'>
      {selectedLabel}
    </div>
  {:else}
    <div class='select'>
      <Select 
        items={options}
        {...$$restProps}
        {selectedValue}
        on:select={select}
        optionIdentifier={id}
        getOptionLabel={$$restProps.getOptionLabel || getLabel}
        getSelectionLabel={getSelectionLabel}
        isClearable={false}
      />
      <div class='arrow'>
        <div class='down' />
      </div>
    </div>
  {/if}
</div>

<style>
  .select {
    min-width: 200px;
    position: relative;
    --border: 0;
    --background: var(--pale);
    --padding: 16px 8px;
    --height: 52px;
  }
  .display {
    min-width: 200px;
    padding: 16px;
    padding-left: 0;
  }
  .arrow {
    position: absolute;
    display: flex;
    right: 0;
    top: 0;
    height: 100%;
    justify-content: center;
    align-items: center;
    padding-right: 16px;
    pointer-events: none;
  }
  .down {
    width: 0;
    height: 0;
    border-left: 10px solid transparent;
    border-right: 10px solid transparent;
    border-top: 10px solid var(--blue);
  }
</style>

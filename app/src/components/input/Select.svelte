<script>
  import { createEventDispatcher } from 'svelte'
  import Select from 'svelte-select'

  const dispatch = createEventDispatcher()

  export let options = []
  
  export let id = 'id'
  export let value
  export let changed = false
  export let trackChange = false
  export let label = ''
  export let display = false
  export let valueLabel = ''
  export let selectedLabel = ''
  export let selectedItemLabel = ''

  export let getLabel = l =>  l && l[valueLabel || 'name']
  export let getSelectionLabel = l => l && l[selectedItemLabel || valueLabel || 'name'] || getLabel(l)

  let selectedValue

  $: {
    selectedValue = options.find(x => x[id] == value)
  }

  $: selectedLabel = getLabel(selectedValue)

  const select = e => {
    value = e.detail[id]
    selectedValue = e.detail
    dispatch('change', e)
    if(trackChange) {
      changed = true
    }
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
    <div class='select' class:changed>
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
    background: var(--pale);
    border: 1px solid var(--pale);
    --border: 0;
    --background: transparent;
    --padding: 16px 8px;
    --height: 50px;
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

  .changed {
    background-color: rgba(53, 138, 188, 0.2);
    border: 1px solid var(--primary);
  }
</style>

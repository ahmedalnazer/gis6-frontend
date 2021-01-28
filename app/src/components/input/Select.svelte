<script>
  import Select from 'svelte-select'
  export let options = []
  export let getLabel = l => l.name
  export let id = 'id'
  export let value

  let selectedValue

  $: {
    selectedValue = options.find(x => x[id] == value)
  }

  $: console.log(options, selectedValue)

  const select = e => {
    console.log(e.detail)
    value = e.detail[id]
    selectedValue = e.detail
    console.log(value, selectedValue)
  }
</script>

<div class='select'>
  <Select 
    items={options}
    {...$$restProps}
    {selectedValue}
    on:select={select}
    optionIdentifier={id}
    getOptionLabel={$$restProps.getOptionLabel || getLabel}
    getSelectionLabel={$$restProps.getSelectionLabel || getLabel}
    isClearable={false}
  />
  <div class='arrow'>
    <div class='down' />
  </div>
</div>

<style>
  .select {
    position: relative;
    --border: 0;
    --background: var(--pale);
    --padding: 16px 8px;
    --height: 48px;
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

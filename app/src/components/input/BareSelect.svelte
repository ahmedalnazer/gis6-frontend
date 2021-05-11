<script>
  import Select from './Select'
  export let value = ''
  export let options = []
  export let small = false
</script>

<div class='bare-select' class:small>
  <Select isSearchable={false} bind:value options={options} {...$$restProps} />
</div>

<style>
  .bare-select {
    display: inline-block;
  }
  .bare-select :global(.select) {
    min-width: 200px;
    position: relative;
    border: 0;
    --border: 0;
    --background: white;
    --padding: 0px 8px;
    --inputFontSize: 26px;
    --height: 32px;
  }

  .bare-select :global(.select .selectedItem) {
    font-size: 26px;
    line-height: 26px !important;
    height: auto !important;
    font-weight: 600;
    padding-right: 48px;
  }

  .bare-select :global(.select .selectContainer) {
    padding: 0;
  }

  .bare-select :global(.select .selectContainer .indicator) {
    display: none;
  }

  .small.bare-select :global(.select .selectedItem) {
    font-size: 20px;
    line-height: 20px !important;
    height: auto !important;
    font-weight: 600;
    padding-right: 48px;
  }

</style>

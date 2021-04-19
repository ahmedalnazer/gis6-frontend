<script>
  import _ from 'data/language'
  import { onMount } from 'svelte'
  import Screen from "layout/Screen.svelte"
  import { Modal, Input, Icon } from "components"
  import Keyboard from 'components/input/Keyboard.svelte'
  import api from 'data/api'
  import { activeSetpointEditor, openSetpointEditorVai } from 'data/setpoint'
  
  $: enableSearch = materialSearch.tradeName || materialSearch.manufacturer || materialSearch.familyAbbreviation
  $: enableReset = materialSearch.tradeName || materialSearch.manufacturer || materialSearch.familyAbbreviation
  $: changedTradeName = materialSearch.tradeName.length > 0
  $: changedManufacturer = materialSearch.manufacturer.length > 0
  $: changedFamilyAbbreviation = materialSearch.familyAbbreviation.length > 0

  let sortOrder = 'desc'
  let materialSearchResults = []
  let openKeyboard = false
  let materialSearch = {
    tradeName: '',
    manufacturer: '',
    familyAbbreviation: ''
  }
  let searchInputType = ''
  let confirmStart = false
  let meltTemp = ''
  let minMeltTemp = ''
  let maxMeltTemp = ''
  let title = ''

  const showKeyboard = (type, lable) => {
    openKeyboard = true
    searchInputType = type
    title = lable
  }

  const getKeyboardText = textobj => {
    if (textobj.detail.type === "tradeName") materialSearch.tradeName = textobj.detail.done
    if (textobj.detail.type === "manufacturer") materialSearch.manufacturer = textobj.detail.done
    if (textobj.detail.type === "familyAbbreviation") materialSearch.familyAbbreviation = textobj.detail.done
    openKeyboard = false
  }
 
  const toggleSort = () => {
    if (sortOrder == 'asc') { sortOrder = 'desc'}
    else if (sortOrder == 'desc') { sortOrder = 'asc'}

    materialSearchResults = sortMaterialData(materialSearchResults)
  }

  const sortMaterialData = (materialData) => {
    if (sortOrder == 'asc') {
      return (materialData || []).sort((a, b) => {
        let comp = 0
        if ( a.trade_name > b.trade_name ) { comp = 1 }
        else if ( a.trade_name < b.trade_name ) { comp = -1 }
        return comp
      })
    }
    else {
      return (materialData || []).sort((a, b) => {
        let comp = 0
        if ( a.trade_name < b.trade_name ) { comp = 1 }
        else if ( a.trade_name > b.trade_name ) { comp = -1 }
        return comp
      })
    }
  }

  const onSubmit = async () => {
    materialSearchResults = await api.get(`/api/materials/?family_abbreviation=${materialSearch.familyAbbreviation}&trade_name=${materialSearch.tradeName}&manufacturer=${materialSearch.manufacturer}`)
    materialSearchResults = sortMaterialData(materialSearchResults)
    enableReset = true
    enableSearch = false
    enableReset = true
  }

  const onReset = async () => {
    materialSearchResults = []
    materialSearch.tradeName = ''
    materialSearch.manufacturer = ''
    materialSearch.familyAbbreviation = ''
  }

  const confirmStartAction = (spData) => {
    confirmStart = true
    meltTemp = Math.round(spData.melt_temperature)
    minMeltTemp = Math.round(spData.min_melt_temperature)
    maxMeltTemp = Math.round(spData.max_melt_temperature)
  }

  const applySetpoint = () => {
    confirmStart = false
    activeSetpointEditor.set('setpoint')
    openSetpointEditorVai.set({
      source: 'materialdb',
      data: {
        meltTemp,
        minMeltTemp: meltTemp - minMeltTemp,
        maxMeltTemp: maxMeltTemp - meltTemp
      }
    })
  }

  onMount(() => { })

  const openConfirmation = () => {
    console.log("openConfirmation")
  }

</script>

<Screen title={$_("Material Database")}>
  <div class="material-form">
    <div class="material-subtitle">
      {$_("Search the material database to prefill the process with setpoints for the material.")}
    </div>
    <div class="grid-container">
      <div class="trade-name">
        <Input
          type="text"
          trackChange
          class="search-fields"
          label="{$_('Trade Name')}"
          placeholder="{$_('Enter material trade name')}"
          bind:value={materialSearch.tradeName}
          on:focus={e => showKeyboard("tradeName", "Trade Name")}
          bind:changed={changedTradeName}
        />
      </div>
      <div class="grid-parent">
        <div class="manufacturer">
          <Input
            type="text"
            trackChange
            class="search-fields"
            label="{$_('Manufacturer')}"
            placeholder="{$_('Enter name')}"
            bind:value={materialSearch.manufacturer}
            on:focus={e => showKeyboard("manufacturer", "Manufacturer")}
            bind:changed={changedManufacturer}
          />
        </div>
        <div class="family-abbreviation">
          <Input
            type="text"
            trackChange
            class="search-fields"
            label="{$_('Family Abbreviation')}"
            placeholder="{$_('Enter abbreviation')}"
            bind:value={materialSearch.familyAbbreviation}
            on:focus={e => showKeyboard("familyAbbreviation", "Family Abbreviation")} 
            bind:changed={changedFamilyAbbreviation}
          />
        </div>
      </div>
    </div>

    <div class="form-buttons">
      <div class="button reset" on:click={() => onReset()} class:disabled={!enableReset}>
        {$_("Reset")}
      </div>
      <div class="button search active" on:click={() => onSubmit()} class:disabled={!enableSearch}>
        {$_("Search")}
      </div>
    </div>
  </div>
  <div class="material-container">
    <div class="material-grid-body">
        <div class="material-grid header">
            <div class="material-grid-header sortable" on:click={() => toggleSort()}><div class="grid-header-text">Trade Name</div><div class="sort-icon">
              {#if sortOrder == 'desc'}
                <Icon icon='down' />
              {:else}
                <Icon icon='up' />
              {/if}
            </div>  </div>
            <div class="material-grid-header">Melt Temp (Min-Max)</div>
            <div class="material-grid-header">&nbsp;</div>
        </div>

        {#each materialSearchResults as searchResult}
          <div class="material-grid-item item">
              <div class="item-text-trade-name">{searchResult.trade_name}</div>
              <div class="item-text-melt">{`${Math.round(searchResult.melt_temperature)} \xB0C (${Math.round(searchResult.min_melt_temperature)} - ${Math.round(searchResult.max_melt_temperature)} \xB0C)`}</div>
              <div class="apply-setpoint" on:click={() => { confirmStartAction(searchResult) }}>{$_("Open Setpoint Editor")}</div>
          </div>
        {/each}

        {#if materialSearchResults.length <= 0}
            <div class="item mute">
                <div class="no-record muted">{$_("No records found")}</div>
            </div>
        {/if}
      </div>
    </div>
</Screen>

{#if confirmStart}
  <Modal
      title={`${$_("Confirm setpoint change to")} ${meltTemp} \xB0C`}
      onClose={() => confirmStart = false}
  >
  <div class="modal-text">
    <p>
      {$_("Applying the temperature setpoint value to the current process will reset the setpoint for all zones to")} {`${meltTemp} \xB0C`}
    </p>

    <div class="modal-buttons">
      <div class="button confirm-button" on:click={() => applySetpoint()}>
        {$_("Open Setpoint Editor")}
      </div>
    </div>
  </div>
  </Modal>
  {/if}

{#if openKeyboard}
  <Keyboard
    showDropdown={true}
    searchInputType={searchInputType}
    dropdownSetting={materialSearch}
    title={title}
    bind:onModalOpen={openKeyboard}
    on:keypadClosed={() => openKeyboard = false}
    on:done={(kcontent) => getKeyboardText(kcontent)} maxCharacter=12
  />
{/if}

<style lang="scss">
  .material-form {
    border-bottom: 1px solid #ddd;
    padding-bottom: 40px;
    .material-subtitle {
      color: #011F3E;
      font-family: "Open Sans";
      font-size: 16px;
      letter-spacing: 0;
      line-height: 22px;
      padding-bottom: 40px;
    }
  }
  .search-fields {
    :global(input) {
      width: 100%;
    }
  }

  .grid-container {
    display: grid;
    grid-template-columns: 3fr 1fr;
    grid-template-rows: 1fr 1fr;
    gap: 40px 20px;
    grid-template-areas:
      "trade-name ."
      "grid-parent .";
    :global(input) {
      width: 100%;
    }
  }

  .trade-name { grid-area: trade-name; }

  .grid-parent {
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 1fr;
    gap: 10px 15px;
    grid-template-areas:
      "manufacturer family-abbreviation";
    grid-area: grid-parent;
  }

  .manufacturer {
    display: grid;
    grid-template-columns: 1fr;
    grid-template-rows: 1fr;
    gap: 0px 0px;
    grid-template-areas:
      ".";
    grid-area: manufacturer;
  }

  .family-abbreviation {
    display: grid;
    grid-template-columns: 1fr;
    grid-template-rows: 1fr;
    gap: 0px 0px;
    grid-template-areas:
      ".";
    grid-area: family-abbreviation;
  }

  .form-buttons {
    justify-content: space-between;
    display: grid;
    margin-top: 40px;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 1fr;
    gap: 0 50%;
    grid-template-areas:
      "reset search";
    grid-area: form-buttons;
    .button {
      margin: 0;
    }
  }

  .material-container {
    padding: 5px 30px 5px 30px;
  }

  .material-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
  }

  .header {
    // border-top: 1px solid #70777F;
    padding: 13px 20px 20px 20px;
    box-sizing: border-box;
  }

  .material-grid-item {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
  }

  .item {
    border: 1px solid #c2c2c2;
    padding: 20px 20px 20px 20px;
    margin-bottom: -1px;
  }

  .apply-setpoint {
    cursor: pointer;
    color: var(--primary);
    text-align: center;
  }

  .item-text-melt {
    padding-left: 1opx;
  }

  .material-grid-header {
    height: 22px;
    color: #011F3E;
    font-family: "Open Sans";
    font-size: 16px;
    font-weight: 600;
    letter-spacing: 0;
    line-height: 22px;
  }
  
  .sortable {
    cursor: pointer;
  }

  .sort-icon {
    width:12px; 
    float: left; 
    margin-left:8px;
  }

  .grid-header-text {
    float: left;
  }

  .modal-text {
    color: #011F3E;
    font-size: 18px;
    letter-spacing: 0;
    line-height: 24px;
  }

  // :global(.modal-body) {
  //   width: 60% !important;
  //   text-align: center;
  // }
</style>
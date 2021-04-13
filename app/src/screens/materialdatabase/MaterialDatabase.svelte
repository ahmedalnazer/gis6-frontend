<script>
  import _ from 'data/language'
  import { onMount } from 'svelte'
  import Screen from "layout/Screen.svelte"
  import { Modal, Input } from "components"
  import Keyboard from 'components/input/Keyboard.svelte'
  import api from 'data/api'

  $: isDisable = materialSearch.tradeName || materialSearch.manufacturer || materialSearch.familyAbbreviation

  let materialSearchResults = []
  let openKeyboard = false
  let materialSearch = {
    tradeName: '',
    manufacturer: '',
    familyAbbreviation: ''
  }
  let searchInputType = ''

  const showKeyboard = type => {
    openKeyboard = true
    searchInputType = type
  }

  const getKeyboardText = textobj => {
    if (textobj.detail.type === "tradeName") materialSearch.tradeName = textobj.detail.done
    if (textobj.detail.type === "manufacturer") materialSearch.manufacturer = textobj.detail.done
    if (textobj.detail.type === "familyAbbreviation") materialSearch.familyAbbreviation = textobj.detail.done
    openKeyboard = false
  }

  // const close = () => {
  //   console.log('close material')
  // }

  const onSubmit = async () => {
    // console.log('http://172.16.41.219:8000/api/materials/?family_abbreviation=PP&trade_name=011115-563-1&manufacturer=Flint%20Hills%20Resources%20(Formerly%20Huntsman)')
    // materialSearchResults = await api.get('/api/materials/?family_abbreviation=PP&trade_name=011115-563-1&manufacturer=Flint%20Hills%20Resources%20(Formerly%20Huntsman)')
    materialSearchResults = await api.get(`/api/materials/?family_abbreviation=${materialSearch.familyAbbreviation}&trade_name=${materialSearch.tradeName}&manufacturer=${materialSearch.manufacturer}`)
  }

  const onReset = async () => {
    console.log('Reset')
    materialSearchResults = []
    materialSearch.tradeName = ''
    materialSearch.manufacturer = ''
    materialSearch.familyAbbreviation = ''
    // isDisable = true
    // const res = await api.patch(`/report/${reportId}`, report)
  }
  onMount(() => { })

</script>

<Screen title={$_("Material Database")}>
  <div class="material-form">
    <div class="material-subtitle">
      {$_("Search the material database to prefill the process with setpoints for the material.")}
    </div>
    <div class="grid-container">
      <div class="trade-name">
        <Input
          class="search-fields"
          label="{$_('Trade Name')}"
          placeholder="{$_('Enter material trade name')}"
          bind:value={materialSearch.tradeName}
          on:focus={e => showKeyboard("tradeName")}
        />
      </div>
      <div class="grid-parent">
        <div class="manufacturer">
          <Input
            class="search-fields"
            label="{$_('Manufacturer')}"
            placeholder="{$_('Enter name')}"
            bind:value={materialSearch.manufacturer}
            on:focus={e => showKeyboard("manufacturer")}
          />
        </div>
        <div class="family-abbreviation">
          <Input
            class="search-fields"
            label="{$_('Family Abbreviation')}"
            placeholder="{$_('Enter abbreviation')}"
            bind:value={materialSearch.familyAbbreviation}
            on:focus={e => showKeyboard("familyAbbreviation")}
          />
        </div>
      </div>
    </div>

    <div class="form-buttons">
      <div class="button reset" on:click={() => onReset()} class:disabled={!isDisable}>
        {$_("Reset")}
      </div>
      <div class="button search active" on:click={() => onSubmit()} class:disabled={!isDisable}>
        {$_("Search")}
      </div>
    </div>
  </div>
  <div class="material-container">
    <div class="material-grid-body">
        <div class="material-grid header">
            <div>Trade Name</div>
            <div>Melt Temp (Min-Max)</div>
            <div>&nbsp;</div>
        </div>

        {#each materialSearchResults as searchResult}
          <div class="material-grid-item item">
              <div>{searchResult.trade_name}</div>
              <div>{`${searchResult.melt_temperature} (${searchResult.min_melt_temperature} - ${searchResult.max_melt_temperature})`}</div>
              <div>{$_("Apply Setpoint")}</div>
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

{#if openKeyboard}
  <Keyboard
    showDropdown={true}
    searchInputType={searchInputType}
    dropdownSetting={materialSearch}
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
</style>
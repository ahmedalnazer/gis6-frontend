<script>
  import { Modal, Input } from "components"
  import _ from "data/language"
  import Keyboard from 'components/input/Keyboard.svelte'

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

  const close = () => {
    console.log('close material')
  }

  const onSubmit = async () => {
    console.log('Search')
      // isDisable = true
      // const res = await api.patch(`/report/${reportId}`, report)
    }

    const onReset = async () => {
    console.log('Reset')
      // isDisable = true
      // const res = await api.patch(`/report/${reportId}`, report)
    }
</script>

<Modal
    title={$_("Material Database")}
    onClose={close}
  >
  <div class="modal-text">
    <p class="cancel-message">
      {$_("Search the material database to prefill the process with setpoints for the material.")}
    </p>

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

    <div class="modal-buttons">
      <div class="button" on:click={() => onReset}>
        {$_("Reset")}
      </div>
      <div class="button active" on:click={() => onSubmit}>
        {$_("Search")}
      </div>
    </div>
  </div>
</Modal>

{#if openKeyboard}
    <Keyboard
    showDropdown={true}
    searchInputType={searchInputType}
    bind:onModalOpen={openKeyboard}
    on:keypadClosed={() => openKeyboard = false}
    on:done={(kcontent) => getKeyboardText(kcontent)} maxCharacter=12
    />
{/if}

<style lang="scss">
  .modal-text p {
    text-align: left;
    line-height: 27px;
    font-weight: 600;
    font-size: 20px;
    margin-bottom: 40px;
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
  gap: 0px 0px;
  grid-template-areas:
    "trade-name ."
    "grid-parent .";
}

.trade-name { grid-area: trade-name; }

.grid-parent {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr;
  gap: 0px 0px;
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


  .modal-buttons {
    justify-content: space-between;
    .button {
      margin: 0;
    }
  }
</style>

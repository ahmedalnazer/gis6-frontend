<script>
    import _ from 'data/language'
    import { Input, Select } from 'components'
    import Keyboard from 'components/input/Keyboard.svelte'
    import zones, { selectedZones, activeZones } from 'data/zones'
    import zoneTypes from 'data/zones/zone-types'
    import { Icon } from 'components'
    import api from 'data/api'

    export let selection = []
    import { createEventDispatcher } from 'svelte'
    import { text } from 'svelte/internal'

    let indexStart = 1
    let indexStartIncr = 0
    let zoneTypeName = null
    let zoneTypeCustomName = ''
    let openKeyboard = false

    $: defaultTypes = $zoneTypes.filter(x => x.isDefault)
    let customTypes = $zoneTypes.filter(x => !x.isDefault)
    $: zoneTypeValues = getZoneTypesDisplayData($zoneTypes)
    $: showCustomKB = zoneTypeName == 0
    $: { showCustomKB? showKeyboard(): null }

    const getZoneTypesDisplayData = (currZoneTypes) => {
      let hasCustom = currZoneTypes.filter(x => x.id == 0)
      if (! (hasCustom || []).length) {
        currZoneTypes.push({ id: 0, name: "Custom", isDefault: true, isVisible: true })
      }

      return currZoneTypes
    }

    const setGroupName = async (itemSelected, itemStartIndex, itemZoneName) => { 
      indexStartIncr = itemStartIndex
      for(let selectionItem of selection) { 
        await api.put(`zone/${currZone.id}`, { ...currZone, ZoneName: `itemZoneName ${indexStartIncr}` })
        console.log(`${itemZoneName} ${indexStartIncr}`)
        indexStartIncr++
      }
    }

    const applyGroupName = async () => {
      // Process if the dropdown value is selected
      if(selection.length && zoneTypeName && zoneTypeName !== '__CUSTOM__' && zoneTypeName !== '') {
        let currZoneNameData = defaultTypes.filter(x => x.id == zoneTypeName)
        let currZoneName = ''

        if (currZoneNameData.length) {
          currZoneName = currZoneNameData[0].name
          await setGroupName(selection, indexStart, currZoneName)
          await zones.reload()
        }
        else {
          console.error('Validation Error: Zone type name is not invalid')
        }
      }
      else {
        console.error('Validation Error: Nothing selected or Zone type dropdown is empty or invalid')
      }
    }

    const clearStartIndex = () => {
      indexStart = 1
    }

    const showKeyboard = () => {
      openKeyboard = true
    }

    const getKeyboardText = (textobj) => {
      console.log(textobj.detail.done)
      zoneTypeCustomName = textobj.detail.done
    }

    const clearZoneTypeCustomName = () => {
      zoneTypeCustomName = ''
    }
</script>

<div><h2>{$_('Select zone type and index number')}</h2></div>

<div class="zone-type-container">
    <div>
      <Select isSearchable={true} label={$_("Zone type")} bind:value={zoneTypeName} options={zoneTypeValues || []} />

      {#if zoneTypeCustomName !== ''}
      <div class="zone-type-index-desc">
        <div class="edit-icon" on:click={e => showKeyboard()} ><Icon icon='edit' color='var(--primary)' />{zoneTypeCustomName}</div>
        <div on:click={clearZoneTypeCustomName} class="clear-zone-type">clear</div>
      </div>
      {/if}
    </div>
    <div class="zone-type-index-num">
        <Input
            label="{$_('Index start number')}"
            type="number"
            bind:value={indexStart}
            style="width:100%;"
        />
        <div class="zone-type-index-desc">
            <div class="edit-icon"><Icon icon='edit' color='var(--primary)' on:click={e => console.log('edit clicked')} />{indexStart}</div>
            <div on:click={clearStartIndex} class="clear-index">clear</div>
        </div>
    </div>
    <div>
        <label>&nbsp</label>
        <button class="button ignore-task-styles active" on:click={e => applyGroupName()}>
            {$_("Apply")}
        </button>
    </div>
</div>

{#if openKeyboard}
    <Keyboard bind:onModalOpen={openKeyboard} bind:value={zoneTypeCustomName} on:keypadClosed={() => openKeyboard = false} on:done={(kcontent) => getKeyboardText(kcontent)} />
{/if}

<style lang="scss">
    .zone-type-container {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        grid-gap: 8px;
    }

    .zone-type-index-num {
        width: 100%;
    }

    .zone-type-index-desc {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 16px;
        align-items: center;
        padding: 10px;
    }

    .zone-type-container :global(svg) {
      margin-right: 8px;
      height: 14px;
      width: 14px;
      color: #358DCA;
    }

    .edit-icon, .clear-index, .clear-zone-type {
      cursor: pointer;
      color: #358DCA;
    }

</style>

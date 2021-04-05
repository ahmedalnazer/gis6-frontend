<script>
    import _ from 'data/language'
    import { Input, Select } from 'components'
    import Keyboard from 'components/input/Keyboard.svelte'
    import KeyPad from 'components/input/KeyPad.svelte'
    import zones, { selectedZones, activeZones } from 'data/zones'
    import zoneTypes from 'data/zones/zone-types'
    import { Icon } from 'components'
    import api from 'data/api'
    import { notify } from 'data/'

    export let selection = []
    import { createEventDispatcher } from 'svelte'
    import { text } from 'svelte/internal'

    let indexStart = 1
    let indexStartIncr = 0
    let zoneTypeName = null
    let zoneTypeCustomName = ''
    let keypadValue = ''
    let openKeyboard = false
    let openKeypad = false
    let enableSave = false

    let currentItemSelectedId = 0
    let currentItemSelectedName = ''

    export let showManageZoneType = false
    export let keypadAnchor = null

    const keypadcontrols1 = {
      rangeMin: 1,
      rangeMax: 450,
      integerOnly: true,
    }
    
    $: defaultTypes = $zoneTypes.filter(x => x.isDefault)
    let customTypes = $zoneTypes.filter(x => !x.isDefault)
    $: zoneTypeValues = getZoneTypesDisplayData([ ...$zoneTypes ])
    $: showCustomKB = zoneTypeName == 0
    $: { showCustomKB? showKeyboard(): null }
    $: enableSave =  getEnableSaveValue(selection, zoneTypeName, zoneTypeCustomName, indexStart) 
    $: setZoneTypeCustomName(zoneTypeName)

    const getEnableSaveValue = (selectedItemsValue, zoneTypeNameValue, zoneTypeCustomNameValue, indexStartValue) => {
      let canSave = false

      if (zoneTypeNameValue > 0 && indexStartValue !== '' && indexStartValue > 0 && selectedItemsValue.length) {
        canSave = true
      }
      else if (zoneTypeNameValue == 0 && zoneTypeCustomNameValue !== '' && indexStartValue !== '' && indexStartValue > 0  && selectedItemsValue.length)
      {
        canSave = true
      }

      return canSave
    }

    const getZoneTypesDisplayData = (currZoneTypes) => {
      let zoneTypesCopy = currZoneTypes.map(x => ({ ...x })) // Make a copy of the array
      let hasCustom = (zoneTypesCopy || []).filter(x => x.id == 0)
      let defaultZoneTypes = zoneTypesCopy.filter(x => x.isDefault && x.isVisible)
      zoneTypesCopy = zoneTypesCopy.filter(x => !x.isDefault && x.isVisible)
      zoneTypesCopy = zoneTypesCopy.map((x) => { x.name += ' (custom)'; return x})
      let selectZoneTypes = defaultZoneTypes.concat(zoneTypesCopy)

      if (! (hasCustom || []).length) {
        selectZoneTypes.push({ id: 0, name: "Custom", isDefault: true, isVisible: true })
      }

      return selectZoneTypes
    }

    const setGroupName = async (itemSelected, itemStartIndex, itemZoneName) => { 
      indexStartIncr = itemStartIndex
      itemSelected = itemSelected.sort()
      for(let selectionItem of itemSelected) { 
        let currZone = $zones.filter(x => x.id == selectionItem)
        if (currZone.length) {
          const currentType = $zoneTypes.find(x => x.name == itemZoneName)
          if(!currentType) {
            await zoneTypes.create({ name: itemZoneName, isDefault: false, isVisible: true })
          }

          await api.put(`zone/${currZone[0].id}`, { ...currZone[0], ZoneName: `${itemZoneName} ${indexStartIncr}` })
          // console.log(`${selectionItem} ${currZone[0].id}: ${itemZoneName} ${indexStartIncr} ${currZone[0]}`)
        }

        indexStartIncr++
      }
    }

    const applyGroupName = async () => {
      // Process if the dropdown value is selected
      let ztname = ''

      if (selection.length && currentItemSelectedId == 0 && zoneTypeCustomName !== '') {
        // Custom name edited thru default
        ztname = zoneTypeCustomName
      }
      else if (selection.length && zoneTypeName == 0 && zoneTypeCustomName !== '') {
        // Custom name
        ztname = zoneTypeCustomName
      }
      else if(selection.length && zoneTypeName !== 0 && zoneTypeName !== '') {
        // default name or custom pre defined
        let currZoneNameData = $zoneTypes.filter(x => x.id == zoneTypeName)
        if (currZoneNameData.length) {
          ztname = currZoneNameData[0].name
        }
      }

      if (ztname !== '') {
        await setGroupName(selection, indexStart, ztname)
        await zones.reload()
        notify.success($_('Changes applied'))
      }    
    }

    const clearStartIndex = () => {
      indexStart = 1
    }

    const showKeyboard = () => {
      openKeyboard = true
    }

    const showKeypad = () => {
      openKeypad = true
    }

    const setZoneTypeCustomName = (zoneTypeCustomNameValue) => {
      // Set the zone type edit value based on the select change
      if (zoneTypeCustomNameValue) {
        let selZoneNameChange = $zoneTypes.filter(x => x.id == zoneTypeCustomNameValue)
        let zoneNameVal = ''
        if (selZoneNameChange.length > 0) {
          zoneNameVal = selZoneNameChange[0].name
          currentItemSelectedName = selZoneNameChange[0].name
          currentItemSelectedId = selZoneNameChange[0].id
        }
        zoneTypeCustomName = zoneNameVal
      }
    }

    const getKeyboardText = (textobj) => {
      zoneTypeCustomName = textobj.detail.done

      if (currentItemSelectedName !== zoneTypeCustomName) {
        // Create as new custome zone
        let containsZoneName = $zoneTypes.filter(x => x.name == zoneTypeCustomName)
        if (containsZoneName.length > 0) {
          // If the zone exist then repoint there
          currentItemSelectedId = containsZoneName[0].id
          zoneTypeName = currentItemSelectedId
        }
        else {
          currentItemSelectedId = 0 //Custom
        }
      }
    }

    const clearZoneTypeCustomName = () => {
      zoneTypeCustomName = ''
    }
</script>
<div class='wrapper'>
  <div class='widget-wrapper'>
    <h2>{$_('Select zone type and index number')}</h2>
    <div class="zone-type-container">
        <div>
          <Select isSearchable={true} listPlacement='top' label={$_("Zone type")} bind:value={zoneTypeName} options={zoneTypeValues || []} />

          {#if zoneTypeCustomName !== ''}
          <div class="zone-type-index-desc">
            <div class="edit-icon" on:click={e => showKeyboard()} ><Icon icon='edit' color='var(--primary)' />{zoneTypeCustomName}</div>
            <div on:click={clearZoneTypeCustomName} class="clear-zone-type">Clear</div>
          </div>
          {/if}
        </div>
        <div class="zone-type-index-num">
            <Input
                label="{$_('Index start number')}"
                type="number"
                bind:value={indexStart}
                keypadcontrols={keypadcontrols1}
                style="width:100%;"
            />
            <!-- <input type="text" class="input" /> -->
            <div class="zone-type-index-desc">
                <div class="edit-icon" on:click={e => showKeypad()} bind:this={keypadAnchor} ><Icon icon='edit' color='var(--primary)' on:click={e => console.log('edit clicked')} />{indexStart}</div>
                {#if indexStart !== 1}
                  <div on:click={clearStartIndex} class="clear-index">Clear</div>
                {/if}
            </div>
        </div>
        <div>
            <label>&nbsp</label>
            <button class="button active zone-type-apply" class:disabled={!enableSave} on:click={e => applyGroupName()}>
                {$_("Apply")}
            </button>
        </div>
    </div>
  </div>
  <div class="zone-type-toggle">
    <div class="zone-footer-text" on:click={() => showManageZoneType = !showManageZoneType }>
        Manage Zone Types
    </div>
  </div>
</div>

{#if openKeyboard}
    <Keyboard bind:onModalOpen={openKeyboard} bind:value={zoneTypeCustomName} on:keypadClosed={() => openKeyboard = false} on:done={(kcontent) => getKeyboardText(kcontent)} maxCharacter=12/>
{/if}

{#if openKeypad}
  <KeyPad anchor={keypadAnchor} value="{indexStart}" bind:onModalOpen={openKeypad} bind:keypadValue on:keypadClosed={(val) => { indexStart = val.detail.closed; openKeypad = false }} keypadcontrols={keypadcontrols1} />
{/if}

<style lang="scss">
  .wrapper {
    display: flex;
    padding-top: 40px;
  }

  .widget-wrapper {
    flex: 1;
    padding-right: 100px;
    > h2 {
      padding-top: 0;
      margin-top: 0;
    }
  }

  .zone-footer-text {
    color: #358DCA;
    font-size: 16px;
    font-weight: 600;
    letter-spacing: 0;
    line-height: 22px;
    padding-top: 5px;
    float: right;
    cursor: pointer;
  }

  .zone-type-container {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-gap: 8px;
    padding-top: 12px;
  }

    .zone-type-index-num {
        width: 100%;
    }

    .zone-type-index-desc {
        display: grid;
        grid-template-columns: 2fr 1fr;
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

    .clear-index, .clear-zone-type {
      cursor: pointer;
      color: #358DCA;
      font-size: 16px;
      font-weight: 600;
      letter-spacing: 0;
      line-height: 22px;
      text-align: right;
      padding-top: 16px;
    }

    .edit-icon {
      cursor: pointer;
      color: #358DCA;
      font-size: 16px;
      font-weight: 600;
      letter-spacing: 0;
      line-height: 22px;
      padding-top: 16px;
    }

    .zone-type-apply {
      margin-left: 15px;
    }

</style>

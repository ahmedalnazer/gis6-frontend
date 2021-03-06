<script>
    import _ from 'data/language'
    import { Input, Select } from 'components'
    import Keyboard from 'components/input/Keyboard.svelte'

    import zones, { selectedZones, activeZones } from 'data/zones'
    import zoneTypes from 'data/zones/zone-types'
    import api from 'data/api'

    export let selection = []
    import { createEventDispatcher } from 'svelte'

    let indexStart = 1
    let indexStartIncr = 0
    let zoneTypeName = null

    $: defaultTypes = $zoneTypes.filter(x => x.isDefault)
    let customTypes = $zoneTypes.filter(x => !x.isDefault)

    $: console.log(defaultTypes)
  
    const setGroupName = async (itemSelected, itemStartIndex, itemZoneName) => { 
      indexStartIncr = itemStartIndex
      for(let selectionItem of selection) { 
        // await api.put(`zone/${currZone.id}`, { ...currZone, ZoneName: `itemZoneName ${indexStartIncr}` })
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

const dispatch = createEventDispatcher()
    const handleInput = e => value = e.target.value

    export let errors = []
    export let info = []
    export let value
    export let label = ''
    export let note = ''
    export let type = 'text'
    export let inputClass = ''
    export let changed = false
    export let input = null
    export let display = false

    let modalOpened = false

</script>

<div><h2>{$_('Select zone type and index number')}</h2></div>

<div class="zone-type-container">
    <div>
      <label>{$_('Zone type')}</label>
      <select bind:value={zoneTypeName}>
        <option value="">--Select One--</option>
        <option value="__CUSTOM__">Custom</option>
        {#each defaultTypes || [] as defaultTypes}
            <option value={defaultTypes.id}>{defaultTypes.name}</option>
        {/each}
      </select>
      <!-- <Select
            bind:value={zoneTypeName}
            placeholder={$_('Zone type')}
            id='selZoneType'
            options={defaultTypes}
        /> -->
    </div>
    <div>
        <Input
            label="{$_('Index start number')}"
            type="number"
            bind:value={indexStart}
        />
    </div>
    <div>
        <label>&nbsp</label>
        <button class="button ignore-task-styles active" on:click={e => applyGroupName()}>
            {$_("Apply")}
        </button>
    </div>
</div>
<!-- 
<div class='input text {$$restProps.class || ''}' style={modalOpened ? 'z-index: 11;' : ''}>
    <input {type} 
      on:change 
      on:input={handleInput} 
      class:changed
      {value} 
      {...$$restProps} 
      class={inputClass} 
      autocomplete='new-password'
      bind:this={input}
      on:focus={e => {
        dispatch('focus', e)
      if(type == 'text') {
        modalOpened = true
      } 
      }}
    />
</div> -->

<!-- {#if type == 'text' && modalOpened}
    <Keyboard anchor={input} bind:onModalOpen={modalOpened} bind:value on:keypadClosed={() => modalOpened = false} />
{/if} -->

<style lang="scss">
    .zone-type-container {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        grid-gap: 8px;
    }

    input {
        border: 1px solid var(--pale)
    }
</style>

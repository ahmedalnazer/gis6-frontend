<script>
  import { createEventDispatcher } from 'svelte'
  import { Collapsible } from 'components'
  import _ from 'data/language'
  import { onDestroy, onMount } from 'svelte'
  import api from 'data/api'

  export let keypadNumber = 0
  export let value = ''
  export let onModalOpen = false
  export let anchor
  export let maxCharacter = 99999
  export let showDropdown = false
  export let dropdownSetting = {}
  export let searchInputType = ''

  const dispatch = createEventDispatcher()

  let _keypadNumber = ''
  let leftArrow = false, rightArrow = false, arrowPosition = 0, capLock = false
  let styleTag = document.createElement("style")
  let keyboardCapLock = 'OFF'
  let optionsMaterial = []
  let open = false

  $: reachedMaxChar = value.length >= maxCharacter

  $: {
    keypadNumber = parseFloat(_keypadNumber)
  }

  let openKeypad = false

  export const openKeypadModal = () => {
    let top, left
    openKeypad = true
    // const inputDimensions = anchor.getBoundingClientRect()

    setTimeout(() => {
      const modal = getInputField('content-wrapper')
      if (modal) {
        const modalDimensions = modal.getBoundingClientRect()
        
        // if (window.innerWidth - inputDimensions.right - 20 > modalDimensions.width) {
        //   left = inputDimensions.right + 20
        //   leftArrow = true
        // } else {
        //   left = inputDimensions.left - modalDimensions.width - 20
        //   rightArrow = true
        // }       

        // if (window.innerHeight - inputDimensions.top - 20 > modalDimensions.height) {
        //   top = inputDimensions.top - 20
        //   arrowPosition = 'top: 26px; bottom: unset;'
        // } else {
        //   top = inputDimensions.bottom - modalDimensions.height + 20
        //   arrowPosition = 'bottom: 26px; top: unset;'
        // }

        // if (top) modal.style.top = `${top}px`
        // if (left) modal.style.left = `${left}px`

        styleTag.innerHTML =`
          .keypad-modal-wrapper.content-wrapper:before, 
          .keypad-modal-wrapper.content-wrapper:after {
            ${arrowPosition}
          }
        `
        
        modal.style.visibility = 'visible'
      }
    }, 0)
  }

  const getInputField = field => {
    return document.getElementById(field)
  }

  const getNumber = e => {
    getInputField('place-char').value += e.target.innerText
    value = parseFloat(getInputField('place-char').value)

    if (anchor && anchor.dispatchEvent) {
      anchor.dispatchEvent(new Event('change'))
    }
  }

  const getSelectOptions = async (text) => {
    let options = []
    // let type = ''
    let qry = ''
    // {"tradeName":"87510 Gray 260","manufacturer":"25SP","familyAbbreviation":""}

    if (searchInputType === 'tradeName') {
      // type = 'trade_name'
      qry = `trade_name=${text}${dropdownSetting.manufacturer?`&manufacturer=${dropdownSetting.manufacturer}`:''}${dropdownSetting.familyAbbreviation?`&family_abbreviation=${dropdownSetting.familyAbbreviation}`:''}`
    }
    if (searchInputType === 'manufacturer') {
      // type = 'manufacturer'
      qry = `manufacturer=${text}${dropdownSetting.tradeName?`&trade_name=${dropdownSetting.tradeName}`:''}${dropdownSetting.familyAbbreviation?`&family_abbreviation=${dropdownSetting.familyAbbreviation}`:''}`
    }

    if (searchInputType === 'familyAbbreviation') {
      // type = 'family_abbreviation'
      qry = `family_abbreviation=${text}${dropdownSetting.tradeName?`&trade_name=${dropdownSetting.tradeName}`:''}${dropdownSetting.manufacturer?`&manufacturer=${dropdownSetting.manufacturer}`:''}`
    }

    // const res = await api.get(`/materials/?${type}=${text}`)
    const res = await api.get(`/materials/?${qry}`)
    if (res) {
      open = true
      for (let item of res) {
        if (searchInputType === 'manufacturer') {
          options.push({"id": item.id, "name": item.manufacturer})
        }
        else if (searchInputType === 'familyAbbreviation') {
          options.push({"id": item.id, "name": item.family_abbreviation})
        }
        else {
          options.push({"id": item.id, "name": item.trade_name})
        }
      }
    }
    optionsMaterial = options
  }

  const selectMaterial = material => {
    value = material.name
    openKeypad = false
    dispatch('done', { done: value, type: searchInputType })
  }

  const getText = e => {
    if(!reachedMaxChar) {
      getInputField('place-char').value += e.target.innerText
      value = getInputField('place-char').value
      console.log(`Txt ${value}`)
      if (showDropdown) getSelectOptions(value)
      if (anchor && anchor.dispatchEvent) {
        anchor.dispatchEvent(new Event('change'))
      }
    }
  }

  const actionKey = (actionKeyType) => {
    if (actionKeyType == 'backspace') {
      value = value.slice(0, -1)
      if (value.length <= 0) open = false
    }
    else if (actionKeyType == 'delete') {
      value = ''
      open = false
    }
    else if (actionKeyType == 'cap') {
      if (keyboardCapLock == 'ON') { 
        keyboardCapLock = 'OFF' 
        capLock = false
      }
      else {
        keyboardCapLock = 'ON'
        capLock = true
      }
    }
    else if (actionKeyType == 'shift') {
      // TODO: not sure how to handle this
    }
    else if (actionKeyType == 'space') {
      value = value + ' '
    }
  }

  const closeKeypadModal = () => {
    openKeypad = false
    dispatch('keypadClosed', { closed: value })
  }

  const doneKeypadModal = () => {
    openKeypad = false
    dispatch('done', { done: value })
  }

  const clearNumber = () => {
    getInputField('place-char').value = ''
  }

  onMount(() => {
    if (onModalOpen) openKeypadModal()
    document.head.appendChild(styleTag)
  })
  onDestroy(() => {
    document.head.removeChild(styleTag)
  })
</script>


{#if openKeypad}
  <div class="modal" on:click={() => closeKeypadModal()}>
    <div class="backdrop" />
    <div class="keypad-modal-wrapper content-wrapper" 
      id="content-wrapper" 
      style="visibility:hidden" 
      on:click|stopPropagation
      class:leftArrow
      class:rightArrow
    >
      <div class="content">
        <div class="text-content">
          <input type="text" id='place-char' bind:value="{value}" />
          {#if showDropdown}
            <div class='dropdown-anchor'>
              <div class='dropdown'>
                <Collapsible {open}>
                  <div class='menu'>
                    {#each optionsMaterial as option}
                      <div
                        class='option'
                        on:click={() => selectMaterial(option)}
                      >
                        <span>{option.name}</span>
                      </div>
                    {/each}
                  </div>
                </Collapsible>
              </div>
            </div>
          {/if}
        </div>
        <div class="char-box">
          <div class="char" on:click={e => getText(e)}><span>{$_('~')}</span></div>
          <div class="char" on:click={e => getText(e)}><span>{$_('1')}</span></div>
          <div class="char" on:click={e => getText(e)}><span>{$_('2')}</span></div>
          <div class="char" on:click={e => getText(e)}><span>{$_('3')}</span></div>
          <div class="char" on:click={e => getText(e)}><span>{$_('4')}</span></div>
          <div class="char" on:click={e => getText(e)}><span>{$_('5')}</span></div>
          <div class="char" on:click={e => getText(e)}><span>{$_('6')}</span></div>
          <div class="char" on:click={e => getText(e)}><span>{$_('7')}</span></div>
          <div class="char" on:click={e => getText(e)}><span>{$_('8')}</span></div>
          <div class="char" on:click={e => getText(e)}><span>{$_('9')}</span></div>
          <div class="char" on:click={e => getText(e)}><span>{$_('0')}</span></div>
          <div class="char" on:click={e => getText(e)}><span>{$_('-')}</span></div>
          <div class="char" on:click={e => getText(e)}><span>{$_('+')}</span></div>
          <div class="char" on:click={e => getText(e)}><span>{$_('\\')}</span></div>
          <div class="splchar" on:click={e => actionKey('backspace')}><span>{$_('Backspace')}</span></div>
        </div>
        <div class="char-box">
          <div class="char" on:click={e => getText(e)}><span>{$_(capLock? 'Q': 'q')}</span></div>
          <div class="char" on:click={e => getText(e)}><span>{$_(capLock? 'W': 'w')}</span></div>
          <div class="char" on:click={e => getText(e)}><span>{$_(capLock? 'E': 'e')}</span></div>
          <div class="char" on:click={e => getText(e)}><span>{$_(capLock? 'R': 'r')}</span></div>
          <div class="char" on:click={e => getText(e)}><span>{$_(capLock? 'T': 't')}</span></div>
          <div class="char" on:click={e => getText(e)}><span>{$_(capLock? 'Y': 'y')}</span></div>
          <div class="char" on:click={e => getText(e)}><span>{$_(capLock? 'U': 'u')}</span></div>
          <div class="char" on:click={e => getText(e)}><span>{$_(capLock? 'I': 'i')}</span></div>
          <div class="char" on:click={e => getText(e)}><span>{$_(capLock? 'O': 'o')}</span></div>
          <div class="char" on:click={e => getText(e)}><span>{$_(capLock? 'P': 'p')}</span></div>
          <div class="char" on:click={e => getText(e)}><span>{$_(capLock? '[': '{')}</span></div>
          <div class="char" on:click={e => getText(e)}><span>{$_(capLock? ']': '}')}</span></div>
          <div class="splchar" on:click={e => actionKey('delete')}><span>{$_('Delete')}</span></div>
        </div>
        <div class="char-box">
          <div class="splchar" on:click={e => actionKey('cap')}><span class:capLock>{$_('Cap')}</span></div>
          <div class="char" on:click={e => getText(e)}><span>{$_(capLock? 'A': 'a')}</span></div>
          <div class="char" on:click={e => getText(e)}><span>{$_(capLock? 'S': 's')}</span></div>
          <div class="char" on:click={e => getText(e)}><span>{$_(capLock? 'D': 'd')}</span></div>
          <div class="char" on:click={e => getText(e)}><span>{$_(capLock? 'F': 'f')}</span></div>
          <div class="char" on:click={e => getText(e)}><span>{$_(capLock? 'G': 'g')}</span></div>
          <div class="char" on:click={e => getText(e)}><span>{$_(capLock? 'H': 'h')}</span></div>
          <div class="char" on:click={e => getText(e)}><span>{$_(capLock? 'J': 'j')}</span></div>
          <div class="char" on:click={e => getText(e)}><span>{$_(capLock? 'K': 'k')}</span></div>
          <div class="char" on:click={e => getText(e)}><span>{$_(capLock? 'L': 'l')}</span></div>
          <div class="char" on:click={e => getText(e)}><span>{$_(capLock? ':': ';')}</span></div>
          <div class="char" on:click={e => getText(e)}><span>{$_(capLock? '\"': '\'')}</span></div>
        </div>
        <div class="char-box">
          <div class="splchar" on:click={e => actionKey('shift')}><span>{$_('Shift')}</span></div>
          <div class="char" on:click={e => getText(e)}><span>{$_(capLock? 'Z': 'z')}</span></div>
          <div class="char" on:click={e => getText(e)}><span>{$_(capLock? 'X': 'x')}</span></div>
          <div class="char" on:click={e => getText(e)}><span>{$_(capLock? 'C': 'c')}</span></div>
          <div class="char" on:click={e => getText(e)}><span>{$_(capLock? 'V': 'v')}</span></div>
          <div class="char" on:click={e => getText(e)}><span>{$_(capLock? 'B': 'b')}</span></div>
          <div class="char" on:click={e => getText(e)}><span>{$_(capLock? 'N': 'n')}</span></div>
          <div class="char" on:click={e => getText(e)}><span>{$_(capLock? 'M': 'm')}</span></div>
          <div class="char" on:click={e => getText(e)}><span>{$_(capLock? ',': '<')}</span></div>
          <div class="char" on:click={e => getText(e)}><span>{$_(capLock? '.': '>')}</span></div>
          <div class="char" on:click={e => getText(e)}><span>{$_(capLock? '/': '?')}</span></div>
          <div class="splchar" on:click={e => actionKey('shift')}><span>{$_('Shift')}</span></div>
        </div>
        <div class="char-box-">
          <div class="splchar" on:click={e => actionKey('space')}><span>{$_('Space')}</span></div>
        </div>
        <div class="char-box-">
          <button on:click={(e) => { closeKeypadModal(); doneKeypadModal() }} class="button ignore-task-styles active keypad-ok-btn">Done</button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style lang="scss">
  div.modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 9;
  }
  div.backdrop {
    position: absolute;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.4);
  }
  div.content-wrapper {
    z-index: 10;
    max-width: 100vw;
    border-radius: 0.3rem;
    background-color: white;
    position: relative;
    /* left:0px; */
    /* right: 0px; */
    /* width: 100%; */
  }

  .capLock {
    font-weight: 650;
  }

  .content-wrapper.leftArrow:before {
    content: '';
    position: absolute;
    width: 0;
    height: 0;
    /* left: -18px; */
    border-top: 20px solid transparent;
    border-bottom: 20px solid transparent;
    border-right: 20px solid white;
    clear: both;
  }
  .content-wrapper.rightArrow:after {
    content: '';
    position: absolute;
    right: -18px;
    width: 0;
    height: 0;
    border-top: 20px solid transparent;
    border-bottom: 20px solid transparent;
    border-left: 20px solid white;
    clear: both;
  }
  .text-content {
  }
  .text-content input {
    margin: 0 auto;
  }

  div.content {
    /* width: 1264px; */
    border-radius: 2px;
    background-color: #FFFFFF;
    box-shadow: 0 2px 5px 0 rgba(112,119,127,0.59);
    padding: 20px;
    text-align: center;
  }
  .char-box {
    display: flex;
    flex-wrap: wrap;
  }
  .char {
    /* height: 60px;
    width: 60px; */
    border-radius: 4px;
    background-color: #FFFFFF;
    box-shadow: 0 2px 5px 0 rgba(54,72,96,0.5);
    flex-grow: 1;
    margin: 7px;
    padding: 14px 14px 14px 14px;
    cursor: pointer;
  }

  .char:hover {
    opacity: .7;
  }

  .char span {
    color: #358DCA;
    /* font-size: 36px; */
    font-size: 28px;
    letter-spacing: 0;
    justify-content: center;
    align-items: center;
    display: flex;
  }
  .splchar {
    border-radius: 4px;
    background-color: #FFFFFF;
    box-shadow: 0 2px 5px 0 rgba(54,72,96,0.5);
    flex-grow: 1;
    margin: 7px;
    padding: 14px 14px 14px 14px;
    cursor: pointer;
  }

  .splchar:hover {
    opacity: .7;
  }

  .splchar span {
    color: #358DCA;
    /* font-size: 36px; */
    font-size: 24px;
    letter-spacing: 0;
    justify-content: center;
    align-items: center;
    display: flex;
  }

  .ml-0, .mr-0 {
    margin-left: 0;   
  }
  .mr-0 {
    margin-right: 0;   
  }

  #place-char {
    box-sizing: border-box;
    height: 59px;
    /* width: 224px; */
    border: 1px solid #CCCCCC;
    border-radius: 2px;
    background-color: #FFFFFF;
    margin-bottom: 14px;
    padding: 9px 20px;
  }
  input[type=text]#place-char{
    color: #364860;
    font-family: "Open Sans";
    font-size: 30px;
    letter-spacing: 0;
    line-height: 41px;
    text-align: right;
  }
  .keypad-ok-btn {
    /* border-radius: 2px;
    background-color: #358DCA;
    box-shadow: 0 2px 0 0 #364860;
    color: #FFFFFF;
    font-family: "Open Sans";
    font-size: 16px;
    font-weight: 600;
    letter-spacing: 0;
    line-height: 18px;
    text-align: center;

    padding: 10px 54px;
    border-color: #358DCA; */
    margin-top: 30px;
  }
  .char label {
    color: #358DCA;
    font-family: "Open Sans";
    letter-spacing: 0;
    align-items: center;
    justify-content: center;
    margin: 0;
    font-weight: bold;
    line-height: 13px;
  }
  .char label.clear {
    font-size: 9px;
    text-transform: uppercase;
  }
  .clear-button :global(svg) {
    width: 16px;
    margin-bottom: 5px;
  }

  .dropdown-anchor {
    width: 40%;
    margin: 0 auto;
    margin-bottom: 14px;
    max-height: 25vh;
    overflow: auto;
    border-radius: 4px;
    background-color: #FFFFFF;
    box-shadow: 0 2px 5px 0 rgba(54,72,96,0.5);
  }
  .menu {
    padding-top: 16px;
  }
  .option {
    padding: 5px 20px;
    display: flex;
    align-items: center;
    color: #011F3E;
    font-family: "Open Sans";
    font-size: 16px;
    letter-spacing: 0;
    line-height: 40px;
  }
  .option:hover {
    background-color: #F5F6F9;
  }
</style>

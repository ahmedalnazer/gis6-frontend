<script>
  import { createEventDispatcher } from 'svelte';
  import { Icon } from 'components'
  import _ from 'data/language'
  import { onDestroy, onMount } from 'svelte'

  const dispatch = createEventDispatcher();

  export let keypadNumber = 0
  export let value = 0
  
  let _keypadNumber = ''
  export let onModalOpen = false
  export let anchor
  let leftArrow = false, rightArrow = false, arrowPosition = 0
  let styleTag = document.createElement("style");
  
  $: {
    keypadNumber = parseFloat(_keypadNumber)
  }

  let openKeypad = false

  export const openKeypadModal = () => {
    let top, left
    openKeypad = true
    const inputDimensions = anchor.getBoundingClientRect()

    setTimeout(() => {
      const modal = getInputField('content-wrapper')
      if (modal) {
        const modalDimensions = modal.getBoundingClientRect()
        
        if ((window.innerWidth - inputDimensions.right - 20) > modalDimensions.width) {
          left = inputDimensions.right + 20
          leftArrow = true
        } else {
          left = inputDimensions.left - modalDimensions.width - 20
          rightArrow = true
        }       

        if ((window.innerHeight - inputDimensions.top - 20) > modalDimensions.height) {
          top = inputDimensions.top - 20
          arrowPosition = 'top: 26px; bottom: unset;'
        } else {
          top = inputDimensions.bottom - modalDimensions.height + 20
          arrowPosition = 'bottom: 26px; top: unset;'
        }

        if (top) modal.style.top = `${top}px`
        if (left) modal.style.left = `${left}px`

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
    getInputField('place-number').value += e.target.innerText
    value = parseFloat(getInputField('place-number').value)
    anchor.dispatchEvent(new Event('change'))
  }

  const closeKeypadModal = () => {
    openKeypad = false
    dispatch('keypadClosed', { closed: value });
  }

  const clearNumber = () => {
    getInputField('place-number').value = ''
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
        <input type="text" id='place-number' />
        <div class="number-box">
            <div class="number ml-0"><span on:click={e => getNumber(e)}>7</span></div>
            <div class="number"><span on:click={e => getNumber(e)}>8</span></div>
            <div class="number mr-0"><span on:click={e => getNumber(e)}>9</span></div>
            <div class="number ml-0"><span on:click={e => getNumber(e)}>4</span></div>
            <div class="number"><span on:click={e => getNumber(e)}>5</span></div>
            <div class="number mr-0"><span on:click={e => getNumber(e)}>6</span></div>
            <div class="number ml-0"><span on:click={e => getNumber(e)}>1</span></div>
            <div class="number"><span on:click={e => getNumber(e)}>2</span></div>
            <div class="number mr-0"><span on:click={e => getNumber(e)}>3</span></div>
            <div class="number ml-0"><span on:click={e => getNumber(e)}>.</span></div>
            <div class="number"><span on:click={e => getNumber(e)}>0</span></div>
            <div class="number mr-0" on:click={() => clearNumber()}>
              <label class='clear-button'>
                <Icon icon='close' color='var(--primary)' />
                <label class="clear">{$_('Clear')}</label>
              </label>
            </div>
        </div>
        <button on:click={() => closeKeypadModal()} class="keypad-ok-btn">OK</button>
      </div>
    </div>
  </div>
{/if}

<style>
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
    max-width: 70vw;
    border-radius: 0.3rem;
    background-color: white;
    position: absolute;
  }
  .content-wrapper.leftArrow:before {
    content: '';
    position: absolute;
    width: 0;
    height: 0;
    left: -18px;
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
  div.content {
    width: 264px;
    border-radius: 2px;
    background-color: #FFFFFF;
    box-shadow: 0 2px 5px 0 rgba(112,119,127,0.59);
    padding: 20px;
    text-align: center;
  }
  .number-box {
    display: flex;
    flex-wrap: wrap;
  }
  .number {
    height: 60px;
    width: 60px;
    border-radius: 4px;
    background-color: #FFFFFF;
    box-shadow: 0 2px 5px 0 rgba(54,72,96,0.5);
    flex-grow: 1;
    margin: 7px;
    padding: 14px;
  }
  .ml-0, .mr-0 {
    margin-left: 0;   
  }
  .mr-0 {
    margin-right: 0;   
  }
  .number span {
    color: #358DCA;
    font-family: "Open Sans";
    font-size: 36px;
    letter-spacing: 0;
    justify-content: center;
    align-items: center;
    display: flex;
  }
  #place-number {
    box-sizing: border-box;
    height: 59px;
    width: 224px;
    border: 1px solid #CCCCCC;
    border-radius: 2px;
    background-color: #FFFFFF;
    margin-bottom: 14px;
    padding: 9px 20px;
  }
  input[type=text]#place-number{
    color: #364860;
    font-family: "Open Sans";
    font-size: 30px;
    letter-spacing: 0;
    line-height: 41px;
    text-align: right;
  }
  .keypad-ok-btn {
    border-radius: 2px;
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
    border-color: #358DCA;
    margin-top: 30px;
  }
  .number label {
    color: #358DCA;
    font-family: "Open Sans";
    letter-spacing: 0;
    align-items: center;
    justify-content: center;
    margin: 0;
    font-weight: bold;
    line-height: 13px;
  }
  .number label.clear {
    font-size: 9px;
    text-transform: uppercase;
  }
  .clear-button :global(svg) {
    width: 16px;
    margin-bottom: 5px;
  }
</style>

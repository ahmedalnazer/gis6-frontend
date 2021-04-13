<script>
  import { Modal, Input } from 'components'
  import LineParams from './LineParams.svelte'
  import _ from 'data/language'
  import { colors } from 'data/charting/line-utils'
  import confirm from 'data/confirm'
  
  export let onClose, onSubmit, stats, setBufferParams

  let _scales = {}
  export { _scales as scales }

  $: currentRate = stats.bufferParams && stats.bufferParams.rate

  let scales = { ..._scales }
  let bufferRate = currentRate

  $: {
    if(currentRate && !bufferRate) {
      bufferRate = currentRate
    }
  }

  $: secondsToFill = 7500 / bufferRate

  let ttf_text = ''
  $: {
    ttf_text = ''
    const h = '' + Math.floor(secondsToFill / 60 / 60)
    const m = '' + Math.floor(secondsToFill % (60 * 60) / 60)
    const s = '' + secondsToFill % 60
    ttf_text = `${h.padStart(2, '0')}:${m.padStart(2, '0')}:${s.padStart(2, '0')}`
  }



  const submit = async () => {
    onSubmit(scales)
    if(bufferRate != currentRate) {
      if(!await confirm($_('This will reset your current buffer, are you sure you want to proceed?'))) {
        return
      }
      setBufferParams({ rate: bufferRate })
    }
    onClose()
  }
</script>

<Modal {onClose} title={$_('Graph Settings')}>
  <div class='wrapper'>
    <div class='ranges'>
      <LineParams bind:scale={scales[1]} label={$_('First')} color={colors[1]} />
      <LineParams bind:scale={scales[2]} label={$_('Second')} color={colors[2]} />
      <LineParams bind:scale={scales[3]} label={$_('Third')} color={colors[3]} />
      <LineParams bind:scale={scales[4]} label={$_('Fourth')} color={colors[4]} />
    </div>

    <div class='time'>
      <Input label={$_('Updates per Second')} type='number' bind:value={bufferRate}/>
      <div class='ttf'>
        <label>{$_('Time to Fill (HH:MM:SS)')}</label>
        <p>{ttf_text}</p>
      </div>
    </div>

    <div class='footer-buttons'>
      <a class='button active' on:click={submit}>{$_('Done')}</a>
    </div>
  </div>
</Modal>

<style lang="scss">
  .wrapper {
    .ranges {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;
    }
  }

  .time {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 20px;
    padding-top: 40px;
    margin-top: 20px;
    border-top: 1px solid var(--gray);
    p {
      padding: 16px 0;
      font-weight: bold;
    }
  }

  .footer-buttons {
    margin-top: 40px;
    text-align: right;
  }
</style>
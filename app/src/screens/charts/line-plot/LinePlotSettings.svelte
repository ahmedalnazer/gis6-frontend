<script>
  import { Modal } from 'components'
  import LineParams from './LineParams.svelte'
  import _ from 'data/language'
  import { colors } from 'data/charting/line-plot'
  
  export let onClose, onSubmit

  let scales = {}

  const submit = () => {
    onSubmit(scales)
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

  .footer-buttons {
    margin-top: 40px;
    text-align: right;
  }
</style>
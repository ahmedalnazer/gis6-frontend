<script>
    import { Modal, Input } from 'components'
    import _ from 'data/language'
    import { notify } from 'data/'
    import TestResults from './TestResults.svelte'
    import Error from './Error.svelte'
    import api from 'data/api'
    import Keyboard from 'components/input/Keyboard.svelte'

    export let onClose
    export let analysis

    let isDisable = false
    let openKeyboard = false
    let title = ''
    let inputField = ''
    let inputFieldValue = ''
    let changed = {}

    const date = new Date()

    const formateDate = () => {
      const dateOptions = { day: '2-digit', month: '2-digit', year: 'numeric' }
      const timeOptions = { hour12: true, hour: 'numeric', minute:'numeric' }
      return `${date.toLocaleDateString('en', dateOptions)} ${date.toLocaleTimeString('en', timeOptions)}`
    }

    let report = {
      reportType: $analysis.type,
      user: $analysis.user,
      user_id: $analysis.user_id,
      mold: $analysis.mold,
      group: $analysis.group,
      maxStartingTemp: $analysis.maxStartingTemp,
      name: `${$analysis.type === 'fault' ? 'fault' : 'wiring'}-analysis-${date.getFullYear()}y_${date.getMonth() + 1}m_${date.getDate()}d_${date.getHours()}h_${date.getMinutes()}m`,
      comment: '',
      startTime: new Date($analysis.startTime).toISOString(),
      endTime: new Date($analysis.endTime).toISOString(),
      zones: $analysis.zones,
      zonesLocked: $analysis.zonesLocked,
      saved: true
    }

    $: reportId = $analysis.reportId

    const onSubmit = async () => {
      isDisable = true
      const res = await api.patch(`/report/${reportId}`, report)
      if (res.id) {
        notify('Changes saved.')
      }
    }

    const showKeyboard = (type, lable, value) => {
      openKeyboard = true
      inputField = type
      title = lable
      inputFieldValue = value
    }

    const getKeyboardText = textobj => {
      if (textobj.detail.field === "name") report.name = textobj.detail.done
      if (textobj.detail.field === "comment") report.comment = textobj.detail.done
      openKeyboard = false
      isDisable = false
      changed[textobj.detail.field] = true
    }

  </script>

  <div class="report-modal">
    <Modal title={`${$analysis.type === 'fault' ? 'Fault' : 'Wiring'} Analysis Report`} {onClose}>
        <div class="report-description">{$_('This report is saved to the reports folder on the home page.')}</div>
        <form on:submit|preventDefault={() => onSubmit()}>
            <div class='grid-two'>
                <Input
                  type='text'
                  bind:value={report.name}
                  label='{$_('Report name')}'
                  on:focus={e => showKeyboard("name", "Report name", report.name)}
                  bind:changed={changed.name}
                />
                <Input
                  type='text'
                  bind:value={report.comment}
                  label='{$_('Comments')}'
                  on:focus={e => showKeyboard("comment", "Comments", report.comment)}
                  bind:changed={changed.comment}
                />
            </div>

            <div class="grid-parent">
                <div class="">
                    <div class='grid'>
                        <div>
                            <label>{$_('Date/Time')}</label>
                            {formateDate()}
                        </div>
                        <div>
                            <label>{$_('User')}</label>
                            {report.user}
                        </div>
                    </div>
                    <div class='grid'>
                        <div>
                            <label>{$_('Mold')}</label>
                            {report.mold}
                        </div>
                        <div>
                            <label>{$_('Groups')}</label>
                            {report.group}
                        </div>
                        <div>
                            <label>{$_('Max Starting Temperature')}</label>
                            {(report.maxStartingTemp || 0)/10} &#176;F
                        </div>
                    </div>
                </div>
                <div class="btn-verticle">
                    <button class="save-button" class:btnDisable={isDisable} disabled={isDisable}>{$_('Save')}</button>
                </div>
            </div>
        </form>

        <TestResults analysis={$analysis} />

        <div class="errors">
            {#if $analysis.errors.length}
              <div class="table-header">
                <div class="name">
                  <p>{$_("Zone")}</p>
                </div>
                <div class="thumb">
                  <p>{$_("Issue")}</p>
                </div>
                <div class='desciption'>&nbsp;</div>
              </div>
              {#each $analysis.errors as error}
                <Error {error} />
              {/each}
            {/if}
        </div>
    </Modal>
  </div>

  {#if openKeyboard}
    <Keyboard
      value={inputFieldValue}
      title={title}
      inputFieldFor={inputField}
      bind:onModalOpen={openKeyboard}
      on:keypadClosed={() => openKeyboard = false}
      on:done={(kcontent) => getKeyboardText(kcontent)}
    />
  {/if}

  <style lang="scss">
    .report-modal {
      :global(.modal-body) {
        padding-top: 24px !important;
      }
    }
    .report-description {
      color: #011F3E;
      font-family: "Open Sans";
      font-size: 16px;
      letter-spacing: 0;
      line-height: 22px;
      margin-bottom: 24px;
    }
    .grid-two {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
      margin-bottom: 30px;
      :global(.input) {
        :global(input) {
          width: 100%;
        }
      }
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin-bottom: 30px;
    }
    .grid-parent {
      display: grid;
      grid-template-columns: 3fr 1fr;
      gap: 16px;
      margin-bottom: 30px;
      border-bottom: 1px solid var(--gray);
    }
    .btn-verticle {
      display: flex;
      align-items: center;
      .save-button {
        box-sizing: border-box;
        border: 2px solid #358DCA;
        border-radius: 1px;
        background-color: #FFFFFF;
        box-shadow: 2px 2px 5px 0 rgba(54,72,96,0.5);
        margin-left: auto;
        color: #358DCA;
        font-family: "Open Sans";
        font-size: 20px;
        font-weight: 600;
        letter-spacing: 0;
        line-height: 18px;
        text-align: center;
        padding: 15px 76px;
      }
      .btnDisable {
        color: #A2A4A8 !important;
        border: 2px solid #A2A4A8 !important;
      }
    }
    .errors {
      overflow: auto;
      .table-header {
        display: grid;
        grid-template-columns: 150px 100px 1fr;
        position: sticky;
        font-weight: 700;
        border-bottom: 1px solid #A2A4A8;
        padding: 0px 40px 10px 40px;
      }
    }
  </style>

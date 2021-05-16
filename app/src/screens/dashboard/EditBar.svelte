<script>
  import AddCardPref from '../users/AddCardPref.svelte'
  import { Icon } from 'components'
  import _ from 'data/language'
  import { commitPreferences, tempEnabled, tempOrder } from 'data/dashboards'
  import user from 'data/user'
  import { tick } from 'svelte'

  export let edit = false
  let showPrefs = false
  export let available = true
  export let dashboard = ''

  const save = async () => {
    edit = false
    await commitPreferences()
  }

  const cancel = async () => {
    edit = false
    await tick()
    tempOrder.set(null)
    tempEnabled.set(null)
  }
</script>

<AddCardPref bind:visible={showPrefs} {dashboard} />

{#if available && $user && !edit}
  <div class="editcard" on:click={() => edit = true}>
    <Icon icon='edit' size="14px" color='var(--primary)' />&nbsp;{$_('Edit Cards')}
  </div>
{/if}


{#if edit}
  <div class="editing-cards">
    <div on:click={() => showPrefs = true}>
      <Icon icon="add" />
      <span>{$_("Add card")}</span>
    </div>
    <div on:click={save}>
      <Icon icon="checkmark" />
      <span>{$_("Done")}</span>
    </div>
    <div on:click={cancel}>
      <Icon icon="close" size="1em" color="#358DCA" />
      <span>{$_("Cancel")}</span>
    </div>
  </div>
{/if}


<style lang="scss">
  .editcard {
    position: absolute;
    bottom: 0;
    width: 100%;
    margin-top: 40px;
    text-align: right;
    padding-right: 25px;
    color: #358DCA;
    font-size: 20px;
    font-weight: 600;
  }

  .editing-cards {
    position: fixed;
    right: 0;
    bottom: 120px;
    width: 100%;
    padding: 22px 40px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    background-color: #FFFFFF;
    box-shadow: 0 -2px 4px 0 rgba(54,72,96,0.4);
    span {
      color: #358DCA;
      font-size: 20px;
      font-weight: 600;
      letter-spacing: 0;
      line-height: 18px;
      margin-left: 5px;
    }
    > :not(:last-child) {
      margin-right: 35px;
    }
  }
</style>

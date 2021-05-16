<script>
  import { Modal } from "components"
  import _ from 'data/language'
  import CheckBox from "components/input/CheckBox.svelte"
  import user from 'data/user'
  import { updateUserProfile } from 'data/user/actions'
  import { dashboardData } from 'data/dashboards/dashboard-data'
  import { enabled as _enabled, tempEnabled } from 'data/dashboards/enabled'

  export let visible = false
  export let dashboard

  const getCards = group => Object.entries(group.cards).map(([ name, card ]) => ({ ...card, name }))

  const getGroups = data => {
    if(!data) return []
    return Object.entries(data).map(([ name, group ]) => {
      return { ...group, name, cards: getCards(group) }
    })
  }

  $: data = $dashboardData[dashboard]
  $: groups = getGroups(data)

  let enabled = {}
  let enableSave = false

  $: {
    // reset any time modal is toggled
    if(visible) {
      enableSave = false
      enabled = $_enabled
    }
  }

  $: {
    // set defaults if needed
    if(!enabled[dashboard]) enabled[dashboard] = {}
    for(let group of groups) {
      if(!enabled[dashboard][group.name]) {
        enabled[dashboard][group.name] = {}
      }
      for(let card of group.cards) {
        if(card.mandatory) {
          enabled[dashboard][group.name][card.name] = card.enabled
        } else {
          enabled[dashboard][group.name][card.name] = enabled[dashboard][group.name][card.name] !== false
        }
      }
    }
  }

  $: {
    if(visible) tempEnabled.set(enabled)
  }

  const save = async () => {
    const prefs = $user.user_card_prefs
    const user_card_prefs = { ...prefs, enabled }
    await updateUserProfile($user.id, { user_card_prefs })
    visible = false
  }
</script>

{#if visible && $user}
  <Modal title={$_("Add Cards")} onClose={() => visible = false}>
    <div class='card-pref-desc'>
      {$_(`Select the checkbox to add it's card to your dashboard then click 'Save' below. To remove a card from your view, simply uncheck it.`)}
    </div>

    <div class='card-pref-container'>
      {#each groups as group}
        <div class='card-pref-section'>
          <div class='card-section-title'>{group.title}</div>
          {#if group.description}
            <div class='card-section-desc'>{group.description}</div>
          {/if}

          <div class='cards'>
            {#each group.cards as card}
              <CheckBox
                label={card.title}
                bind:checked={enabled[dashboard][group.name][card.name]}
                disabled={card.mandatory}
                on:change={() => enableSave = true}
              />
            {/each}
          </div>
        </div>
      {/each}
    </div>

    <div class="savebtn">
      <button class="button active" class:disabled={!enableSave} on:click={save}>
        {$_("Save Selections")}
      </button>
    </div>
  </Modal>
{/if}


<style lang="scss">
  .card-pref-container {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
  }

  .card-pref-desc {
    padding-bottom: 37px;
    font-weight: 300;
  }

  .card-section-title {
    font-size: 20px;
    font-weight: 600;
    letter-spacing: 0;
    line-height: 27px;
    padding-bottom: 20px;
}

  .card-section-desc {
    padding-bottom: 30px;
    font-size: 16px;
    font-weight: 300;
    letter-spacing: 0;
    line-height: 22px;
  }

  .card-pref-section {
    padding-bottom: 40px;
  }

  .cards {
    display: flex;
    flex-direction: column;
  }

  .savebtn {
    text-align: right;
    padding: 60px 0;
  }

</style>

<script>
  import Screen from "layout/Screen.svelte"
  import ActionsPanel from "./ActionsPanel.svelte"
  import Function from "./Function.svelte"
  import Mold from "./Mold.svelte"
  import OrderCard from "./OrderCard.svelte"
  import General from "./General.svelte"
  // import OrderFillin from "./OrderFillin.svelte"
  import DragIndicator from "style/images/DragIndicator.svelte"
  import SortableList from "svelte-sortable-list"
  import Management from "./Management.svelte"
  import AddCardPref from 'screens/users/AddCardPref.svelte'
  import { cardEditor, userCardPref, enableHomeEdit, card_order, sortcards as _sortcards } from 'data/user/cardpref'
  import { Icon } from 'components'
  import user, { roles } from 'data/user'
  import { onMount } from 'svelte'
  import Sortable from "sortablejs"
  import { tick } from "svelte"
  import _ from 'data/language'

  $: sortcards = $_sortcards

  let isLayoutView = false
  let showSetupProductionButton = true
  let userCards = []
  let controllerFunctionCards = []
  let moldProcessOrderCards = []
  let toolsDiagnosticsCards = []
  let generalCards = []
  let sectionData = []
  let editCards = true
  let userCardPrefStore = []

  $:userType = $user? $user.role: 0
  $:getUserCards(userType, $userCardPref)

  const sortSectionDataList = (ev) => {
    sectionData = ev.detail
  }

  const getUserCards = (userTypeId, userCardPref) => {
    
    // USER_TYPE_CHOICES = ((1, "admin"), (2, "operator"), (3, "process_engineer"), (4, "setup"), (5, "plant_manager") )
    userCardPrefStore = userCardPref
    userCards = userCardPref.filter(x => x.UserType == userTypeId)
    if (userCards.length > 0)
    {
        userCards = userCards[0].UserCards
    }

    console.log('userCards')

    controllerFunctionCards = userCards.filter(x => x.Enabled == true && x.CardType == "CONTROLLER_FUNCTIONS")
    moldProcessOrderCards = userCards.filter(x => x.Enabled == true && x.CardType == "MOLD_PROCESS_ORDER")
    toolsDiagnosticsCards = userCards.filter(x => x.Enabled == true && x.CardType == "TOOLS_DIAGNOSTICS")
    generalCards = userCards.filter(x => x.Enabled == true && x.CardType == "GENERAL")
    let cardData = []

    if (controllerFunctionCards.length > 0) {
      cardData.push({ id: 1, CardType: "CONTROLLER_FUNCTIONS", itemOrder: 1 })
    }

    if (moldProcessOrderCards.length > 0) {
      cardData.push({ id: 2, CardType: "MOLD_PROCESS_ORDER", itemOrder: 2 })
    }

    if (toolsDiagnosticsCards.length > 0) {
      cardData.push({ id: 3, CardType: "TOOLS_DIAGNOSTICS", itemOrder: 3 })
    }

    if (generalCards.length > 0) {
      cardData.push({ id: 4, CardType: "GENERAL", itemOrder: 4 })
    }

    sectionData = cardData
  }

  const ondeleteCard = () => {
    userCardPref.set(userCardPrefStore)
  }

  let sortList, sortable

  const resetSortable = async () => {
    await tick()
    if(sortable) sortable.destroy()
    sortable = Sortable.create(sortList, {
      handle: ".editEnabled",
      animation: 150,
      swapThreshold: 0.75
    })
  }

  $: {
    if(sortList && sortcards && $card_order) {
      resetSortable()
    }
  }

  onMount(() => { })
</script>

<svelte:head>
  <title>Dashboard</title>
</svelte:head>

<Screen dashboard class="dashboard-screen">

  <div slot="tasks">
    <ActionsPanel
      on:actionsPanel={(e) => {
        showSetupProductionButton = e.detail.showSetupProductionButton
      }}
    />
  </div>

  {#if isLayoutView}
    <div class="dashboard-body draggable-body">
      <SortableList
        list={sectionData}
        key="id"
        on:sort={sortSectionDataList}
        let:item
      >
        <div>
          {#if item.CardType == 'CONTROLLER_FUNCTIONS'}
            <Function />
          {:else if item.CardType == 'MOLD_PROCESS_ORDER'}
            <Mold />
          {:else if item.CardType == 'TOOLS_DIAGNOSTICS'}
            <Management />
          {:else if item.CardType == 'GENERAL'}
            <General />            
          {/if}
        </div>
      </SortableList>
    </div>
  {:else}
    <div class="dashboard-body" bind:this={sortList}>

      {#if showSetupProductionButton == false}
        <div style="padding:0px 0px 0px 0px;">
          <div class="section-title">
            <div class="dragIcon">
              <DragIndicator size="1.1em" />
            </div>
            <div>PRODUCTION</div>
          </div>

          <div class="section-body">
            <!-- <div class="flexy">
              <OrderFillin />
            </div> -->
            <div class="flexy">
              <OrderCard />
            </div>
          </div>
        </div>
      {/if}

      {#each sectionData as sectionDataItem}
        <div>
          {#if sectionDataItem.CardType == 'CONTROLLER_FUNCTIONS'}
            <Function userCards={controllerFunctionCards} />
          {:else if sectionDataItem.CardType == 'MOLD_PROCESS_ORDER'}
            <Mold userCards={moldProcessOrderCards} on:deleteCard={() => ondeleteCard()} />
          {:else if sectionDataItem.CardType == 'TOOLS_DIAGNOSTICS'}
            <Management userCards={toolsDiagnosticsCards} on:deleteCard={() => ondeleteCard()} />
          {:else if sectionDataItem.CardType == 'GENERAL'}
            <General userCards={generalCards} on:deleteCard={() => ondeleteCard()} />
          {/if}
        </div>
      {/each}
    </div>
  {/if}

  <AddCardPref />

  {#if editCards}
  <div class="editcard" on:click={() => {
      editCards = false
      enableHomeEdit.set(true)
    }}
  >
    <Icon icon='edit' size="14px" color='var(--primary)' />&nbsp;Edit Card
  </div>
  {:else}
    <div class="editing-cards">
      <div on:click={() => cardEditor.set(true)}>
        <Icon icon="add" />
        <span>{$_("Add card")}</span>
      </div>
      <div on:click={() => {
          editCards = true
          enableHomeEdit.set(false)
        }}
      >
        <Icon icon="checkmark" />
        <span>{$_("Done")}</span>
      </div>
      <div on:click={() => {
          editCards = true
          enableHomeEdit.set(false)
        }}
      >
        <Icon icon="close" size="1em" color="#358DCA" />
        <span>{$_("Cancel")}</span>
      </div>
    </div>
  {/if}

</Screen>


<style lang="scss">
  .dashboard-body {
    padding: 8px;
    text-align: left;
  }

  .draggable-body {
    cursor: move;
  }

  :global(.screen-body) {
    padding-top: 22px !important;
  }

  .dashboard-body :global(.drag-header) {
    margin-top: 0;
  }

  :global(.drag-header .title) {
    color: var(--darkBlue);
    font-size: 12px;
    font-weight: bold;
    letter-spacing: 0;
    line-height: 17px;
  }

  .section-title {
    border-bottom: 1px solid rgba(0, 0, 10, 0.1);
    font-weight: 800;
    padding: 15px 5px 5px 5px;
  }

  .section-body {
    padding: 10px 0px 0px 0px;
  }

  .flexy {
    display: flex;
    flex-wrap: wrap;
  }

  .dragIcon {
    float: left;
  }

  .panelItem:hover {
    opacity: 0.8;
  }

  :global(.dashboard-card) {
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  :global(.dashboard-card .title, .card-edit-placeholder .title) {
    letter-spacing: 0;
    line-height: 27px;
    margin-top: 10px;
    margin-bottom: 0;
  }
  .dashboard-body :global(.cardEnabled) {
    box-sizing: border-box;
    border: 2px solid #358DCA;
    border-radius: 2px;
    background-color: #FFFFFF;
    box-shadow: 0 2px 5px 0 rgba(54,72,96,0.5);
    padding: 12px 10px 10px 16px;
  }
  .dashboard-body :global(.bigCard) {
    height: 336px;
  }
  .dashboard-body :global(.smallCard) {
    height: 160px;
  }
  .dashboard-body :global(.card-edit-placeholder) {
    height: 100%;
    display: flex;
    flex-direction: column;
    :global(.title) {
      margin: 0;
      flex: 1;
    }
    :global(div) {
      align-items: center;
      display: flex;
      justify-content: space-between;
    }
  }


  .dashboard-body :global(h2) {
    font-size: 20px;
    font-weight: 600;
    color: var(--darkBlue)
  }

  .editcard {
    position: fixed;
    bottom: 143px;
    right: 0;
    padding-right: 25px;
    cursor: pointer;
    color: #358DCA;
    font-size: 20px;
    font-weight: 600;
    letter-spacing: 0;
    line-height: 18px;
  }

  .editcard:hover {
    opacity: .7;
  }

  .editing-cards {
    position: fixed;
    right: 0;
    bottom: 122px;
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

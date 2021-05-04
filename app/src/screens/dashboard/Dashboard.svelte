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
  import { cardEditor, userCardPref } from 'data/user/cardpref'
  import { Icon } from 'components'
  import user, { roles } from 'data/user'
  import { onMount } from 'svelte'
  import Card from "screens/users/Card.svelte";
  
  let isLayoutView = false
  let showSetupProductionButton = true
  let userCards = []
  let controllerFunctionCards = []
  let moldProcessOrderCards = []
  let toolsDiagnosticsCards = []
  let generalCards = []
  let sectionData = []

  $:userType = $user? $user.role: 0
  $:getUserCards(userType, $userCardPref)

  const sortSectionDataList = (ev) => {
    sectionData = ev.detail
  }

  const getUserCards = (userTypeId, userCardPref) => {
    
    // USER_TYPE_CHOICES = ((1, "admin"), (2, "operator"), (3, "process_engineer"), (4, "setup"), (5, "plant_manager") )
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
    <div class="dashboard-body">

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
            <Mold userCards={moldProcessOrderCards} />
          {:else if sectionDataItem.CardType == 'TOOLS_DIAGNOSTICS'}
            <Management userCards={toolsDiagnosticsCards} />
          {:else if sectionDataItem.CardType == 'GENERAL'}
            <General userCards={generalCards} />
          {/if}
        </div>
      {/each}
    </div>
  {/if}

  <AddCardPref />

  <div class="editcard" on:click={() => { cardEditor.set(true) }}>
    <Icon icon='edit' size="14px" color='var(--primary)' />&nbsp;Edit Card
  </div>

</Screen>


<style lang="scss">
  .dashboard-body {
    padding: 8px;
    text-align: left;
  }

  .draggable-body {
    cursor: move;
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

  .dashboard-body :global(h2) {
    font-size: 20px;
    font-weight: 600;
    color: var(--blue)
  }

  .editcard {
    position: fixed;
    bottom: 140px;
    right: 0;
    padding: 25px;
    cursor: pointer;
  }

  .editcard:hover {
    opacity: .7;
  }

</style>

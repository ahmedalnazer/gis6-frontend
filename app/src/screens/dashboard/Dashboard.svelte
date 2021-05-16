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
  import { cardEditor, userCardPref, card_order, sortcards as _sortcards } from 'data/user/cardpref'
  import { Icon } from 'components'
  import user, { roles } from 'data/user'
  import { onMount } from 'svelte'
  import Sortable from "sortablejs"
  import { tick } from "svelte"
  import _ from 'data/language'
  import EditBar from './EditBar.svelte'

  import CardSet from './CardSet.svelte'

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

  let edit = false
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

  <div class='dashboard-wrapper'>
    <CardSet dashboard='main' {edit} />
    <EditBar dashboard='main' bind:edit />
  </div>
</Screen>


<style lang="scss">
  .dashboard-body {
    padding: 8px;
    text-align: left;
  }

  .dashboard-wrapper {
    position: relative;
    min-height: 100%;
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

</style>

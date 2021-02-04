<script>
  import Screen from "layout/Screen"
  import ActionsPanel from "./ActionsPanel.svelte"
  import Function from "./Function.svelte"
  import Mold from "./Mold.svelte"
  import OrderCard from "./OrderCard.svelte"
  import OrderFillin from "./OrderFillin.svelte"
  import DragIndicator from "style/images/DragIndicator.svelte"
  import SortableList from "svelte-sortable-list"
  import Management from "./Management.svelte"

  let isLayoutView = false

  let showSetupProductionButton = true
  let sectionData = [
    { id: 1, sectionName: "FUNCTIONS", itemOrder: 1 },
    { id: 2, sectionName: "MOLD", itemOrder: 2 },
    { id: 3, sectionName: "MANAGEMENT", itemOrder: 3 },
  ]

  const sortSectionDataList = (ev) => {
    sectionData = ev.detail
  }
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
          {#if item.sectionName == 'FUNCTIONS'}
            <Function />
          {:else if item.sectionName == 'MOLD'}
            <Mold />
          {:else if item.sectionName == 'MANAGEMENT'}
            <Management />
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
          {#if sectionDataItem.sectionName == 'FUNCTIONS'}
            <Function />
          {:else if sectionDataItem.sectionName == 'MOLD'}
            <Mold />
          {:else if sectionDataItem.sectionName == 'MANAGEMENT'}
            <Management />
          {/if}
        </div>
      {/each}
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

  :global(.dashboard-body .card-grid) {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    grid-gap: 16px;
  }

  .dashboard-body :global(h2) {
    font-size: 20px;
    font-weight: 600;
    color: var(--blue)
  }
</style>

<script>
  import Screen from "layout/Screen";
  import ActionsPanel from "./ActionsPanel.svelte";
  import Function from "./Function.svelte";
  import Mold from "./Mold.svelte";
  import ManagementPart from "./ManagementPart.svelte";
  import OrderCard from "./OrderCard.svelte";
  import DragIndicator from "./../style/images/DragIndicator.svelte";
  import SortableList from "svelte-sortable-list";

  let isLayoutView = false;
  
  let showSetupProductionButton = true;
  let sectionData = [
    { id: 1, sectionName: "FUNCTIONS", itemOrder: 1 },
    { id: 2, sectionName: "MOLD", itemOrder: 2 },
    { id: 3, sectionName: "MANAGEMENT", itemOrder: 3 },
  ];

  let mouldData = [
    {
      title: "Manage Mould ",
      itemDesc: "MX232",
      itemImageUrl: "/images/moldimages/mx232.png",
    },
    {
      title: "Manage Process ",
      itemDesc: "Black PP Left Door",
      itemImageUrl: "/images/moldimages/black_pp_left_door.png",
    },
  ];

  let managementData = [
    {
      title: "View Change Log ",
      itemDesc: "Modified 10/8/2020 12:45 PM",
      itemImageUrl: "/images/moldimages/mx232.png",
    },
    {
      title: "Historical Data ",
      itemDesc: "Modified 10/9/2020 12:05 PM",
      itemImageUrl: "/images/moldimages/black_pp_left_door.png",
    },
    {
      title: "Diagnostics ",
      itemDesc: "Modified 11/9/2020 1:05 PM",
      itemImageUrl: "/images/moldimages/black_pp_left_door.png",
    },
  ];

  const sortSectionDataList = (ev) => {
    sectionData = ev.detail;
  };

</script>

<style lang="scss">

// :global(.dashboard-screen) {
  
//   }

  .dashboard-body {
    margin-left: 20px;
    margin-right: 20px;
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
    padding: 3px 0px 0px 0px;
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
</style>

<!--<style>

	.zoneTemp {
		font-size: 25px;
		text-align: center;
	}

	.zoneInfo {
		font-size: 14px;
		color: #70777F;
		text-align: center;
		line-height: 19px;
	}

	.center {
		margin: auto;
		width: 80%;
		padding: 10px;
	}

	.section-title {
		font-weight: 600; 
		padding: 5px;
		color: #FFFFFF;
		cursor: pointer;
		margin-top: 10px;
    margin-bottom: 3px;
	}

	.flexy {
		display: flex;
		flex-wrap: wrap;
	}

	.flexor-content {
		flex-basis: 0;
		height: 0;
		flex-grow: 1;
		overflow: auto;
	}

</style>-->

<svelte:head>
  <title>Dashboard</title>
</svelte:head>

<Screen dashboard class='dashboard-screen'>
  <ActionsPanel on:actionsPanel={(e) => { showSetupProductionButton = e.detail.showSetupProductionButton; }} />

  <!-- <div class="dashboard-body">
    {#if isLayoutView}
      <SortableList {list} key="id" on:sort={sortList} let:item>
        <div>
          <div style="padding:0px 0px 0px 0px;">
            <div class="section-title">
              <div>{item.sectionName}</div>
            </div>
          </div>
        </div>
      </SortableList>
    {:else}
      <SortableListEx />
    {/if}
  </div> -->

  {#if isLayoutView}
    <div class="dashboard-body draggable-body">
      <SortableList
        list={sectionData}
        key="id"
        on:sort={sortSectionDataList}
        let:item>
        <div>
          {#if item.sectionName == 'FUNCTIONS'}
            <div style="padding:0px 0px 0px 0px;">
              <div class="section-title">
                <div class="dragIcon">
                  <DragIndicator size="1.1em" />
                </div>
                <div>{item.sectionName}</div>
              </div>

              <div class="section-body">
                <div class="flexy">
                  <Function {isLayoutView} />
                </div>
              </div>
            </div>
          {:else if item.sectionName == 'MOLD'}
            <div style="padding:0px 0px 0px 0px;">
              <div class="section-title">
                <div class="dragIcon">
                  <DragIndicator size="1.1em" />
                </div>
                <div>{item.sectionName}</div>
              </div>

              <div class="section-body">
                <div style="display: flex; justify-content: space-evenly;">
                  {#each mouldData as mouldDataItem}
                    <div style="width: 50%;">
                      <div style="padding: 5px;">
                        <Mold {mouldDataItem} {isLayoutView} />
                      </div>
                    </div>
                  {/each}
                </div>
              </div>
            </div>
          {:else if item.sectionName == 'MANAGEMENT'}
            <div style="padding:0px 0px 0px 0px;">
              <div class="section-title">
                <div class="dragIcon">
                  <DragIndicator size="1.1em" />
                </div>
                <div>{item.sectionName}</div>
              </div>
            </div>
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
          <div class="flexy">
        <OrderCard />
          </div>
        </div>
      </div>

      {/if}
      {#each sectionData as sectionDataItem}
        <div>
          {#if sectionDataItem.sectionName == 'FUNCTIONS'}
            <div style="padding:0px 0px 0px 0px;">
              <div class="section-title">
                <div class="dragIcon">
                  <DragIndicator size="1.1em" />
                </div>
                <div>{sectionDataItem.sectionName}</div>
              </div>

              <div class="section-body">
                <div class="flexy">
                  <Function />
                </div>
              </div>
            </div>
          {:else if sectionDataItem.sectionName == 'MOLD'}
            <div style="padding:0px 0px 0px 0px;">
              <div class="section-title">
                <div class="dragIcon">
                  <DragIndicator size="1.1em" />
                </div>
                <div>{sectionDataItem.sectionName}</div>
              </div>

              <div class="section-body">
                <div style="display: flex; justify-content: space-evenly;">
                  {#each mouldData as mouldDataItem}
                    <div style="width: 50%;">
                      <div style="padding: 5px;">
                        <Mold {mouldDataItem} />
                      </div>
                    </div>
                  {/each}
                </div>
              </div>
            </div>
          {:else if sectionDataItem.sectionName == 'MANAGEMENT'}
            <div style="padding:0px 0px 0px 0px;">
              <div class="section-title">
                <div class="dragIcon">
                  <DragIndicator size="1.1em" />
                </div>
                <div>{sectionDataItem.sectionName}</div>
              </div>

              <div class="section-body">
                <div style="display: flex;">
                  {#each managementData as managementDataItem}
                    <div style="width: 25%;">
                      <div style="padding: 5px;">
                        <ManagementPart {managementDataItem} />
                      </div>
                    </div>
                  {/each}
                </div>
              </div>
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</Screen>


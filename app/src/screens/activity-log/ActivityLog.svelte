<script>
    import _ from 'data/language'
    import ActivityLogFilter from './ActivityLogFilter.svelte'
    import AlertChips from './AlertChips.svelte'
    import { activeActivityLog, activityLogFilterViewBy, activityLogFilterSelectSystem, activityLogFilterRange } from 'data/activitylog.js'
    import { Modal, Icon } from 'components'
    import { onMount } from 'svelte'
    import log from 'data/activityLog/log.js'
    import moment from 'moment'

    let showDownloadMessage = false
    // let activityLogData = []

    // activityLogData.push({ id: 1, type: 'error', datetime: '03/11/2021 7:32 AM', description: 'The machine is on fire', system: 'Hot Runner', user: '--' })
    // activityLogData.push({ id: 2, type: 'warning', datetime: '03/11/2021 7:32 AM', description: 'The machine is on fire', system: 'Hot Runner', user: '--' })
    // activityLogData.push({ id: 3, type: '', datetime: '03/11/2021 7:32 AM', description: 'The machine is on fire', system: 'Hot Runner', user: '--' })
    // activityLogData.push({ id: 4, type: 'warning', datetime: '03/11/2021 7:32 AM', description: 'The machine is on fire', system: 'Hot Runner', user: '--' })
    // activityLogData.push({ id: 5, type: 'warning', datetime: '03/11/2021 7:32 AM', description: 'The machine is on fire', system: 'Hot Runner', user: '--' })
    // activityLogData.push({ id: 6, type: 'warning', datetime: '03/11/2021 7:32 AM', description: 'The machine is on fire', system: 'Hot Runner', user: '--' })
    // activityLogData.push({ id: 7, type: 'warning', datetime: '03/11/2021 7:32 AM', description: 'The machine is on fire', system: 'Hot Runner', user: '--' })
    // activityLogData.push({ id: 8, type: 'warning', datetime: '03/11/2021 7:32 AM', description: 'Description of change made. Lorem ipsum short dalor sit. Resolved.', system: 'Monitoring', user: 'Resolved by Todd Knight' })
    // activityLogData.push({ id: 9, type: 'warning1', datetime: '03/11/2021 7:32 AM', description: 'Description of change made. Lorem ipsum short dalor sit. Resolved.', system: 'Monitoring', user: 'Resolved by Todd Knight' })
    // activityLogData.push({ id: 10, type: 'alert1', datetime: '03/11/2021 7:32 AM', description: 'The machine is on fire', system: 'Hot Runner', user: '--' })

    const convertMonthsToHours = m => {
      let todayDate = new Date()
      let beforeDate = new Date()
      beforeDate.setMonth(beforeDate.getMonth() - m)
      return (todayDate - beforeDate) / 3600000
    }
    const lastOneMonths = convertMonthsToHours(1)
    const lastThreeMonths = convertMonthsToHours(3)

    let viewByFilterControlData = [
      { id:0, name:'Alerts/Warnings', logLevels: "0,1,2,3,4" },
      { id:1, name:'Changes', logLevels: "5,6,7,8" }
    ]

    let selectSystemsFilterControlData = [
      { id:0, name:'Balancing' },
      { id:1, name:'Hot Runner' },
      { id:2, name:'Monitoring' },
      { id:3, name:'Valve Pins' }
    ]

    let rangeFilterControlData = [
      { id:0, name:'Last hour', hoursAgo: 1 },
      { id:1, name:'Last 3 hrs', hoursAgo: 3 },
      { id:2, name:'Last 8 hrs', hoursAgo: 8 },
      { id:3, name:'Last 24 hrs', hoursAgo: 24 },
      { id:4, name:'Last week', hoursAgo: 168 },
      { id:5, name:'Last month', hoursAgo: lastOneMonths },
      { id:6, name:'Last 3 months', hoursAgo: lastThreeMonths }
    ]

    let viewByFilterControlDataSelected = []
    let selectSystemsFilterControlDataSelected = []
    let rangeFilterControlDataSelected = []

    let viewByFilterData = []
    let selectSystemsFilterData = []
    let rangeFilterData = []
    let enableSave = false

    $: selectSystemsFilterControlDataSelected = $activityLogFilterSelectSystem? $activityLogFilterSelectSystem : selectSystemsFilterControlData
    $: rangeFilterControlDataSelected = $activityLogFilterRange? $activityLogFilterRange : rangeFilterControlData.filter(x => x.id == 2)
    $: {$activeActivityLog; searchLogs()}

    const searchLogs = async () => {
      viewByFilterControlDataSelected = $activityLogFilterViewBy && $activityLogFilterViewBy !== ''? $activityLogFilterViewBy: viewByFilterControlData
      selectSystemsFilterControlDataSelected = $activityLogFilterSelectSystem && $activityLogFilterSelectSystem !== ''? $activityLogFilterSelectSystem: selectSystemsFilterControlData
      rangeFilterControlDataSelected = $activityLogFilterRange && $activityLogFilterRange !== ''? $activityLogFilterRange: rangeFilterControlData.filter(x => x.id == 2)

      let systems = []
      for (let item of selectSystemsFilterControlDataSelected) {
        systems.push(item.name)
      }
      let refLogLevels = []
      for (let item of viewByFilterControlDataSelected) {
        refLogLevels.push(item.logLevels)
      }
      const maxValue = Math.max(...rangeFilterControlDataSelected.map(l => l.hoursAgo))

      const params = {
        system: systems.join(','),
        ref_log_level: refLogLevels.join(','),
      }

      if (Number.isInteger(maxValue)) {
        params.hours_ago = maxValue
      }

      await log.search(params)
    }

    const setDefaultViewByFilter = (viewByFilterControlDataSelected, viewByFilterControlData) => {
      if ($activityLogFilterViewBy) {
        return $activityLogFilterViewBy
      }
      else if (viewByFilterControlDataSelected.length) {
        return viewByFilterControlDataSelected
      }
      else {
        return viewByFilterControlData
      }
    }

    viewByFilterControlDataSelected = setDefaultViewByFilter(viewByFilterControlDataSelected, viewByFilterControlData)
    
    const viewByChanged = (ev) => {
      viewByFilterData = ev.detail
      viewByFilterControlDataSelected = viewByFilterData
      enableSave = true
    }

    const selectSystemsChanged = (ev) => {
      selectSystemsFilterData = ev.detail
      selectSystemsFilterControlDataSelected = selectSystemsFilterData
      enableSave = true
    }

    const rangeChanged = (ev) => {
      rangeFilterData = ev.detail
      rangeFilterControlDataSelected = rangeFilterData
      enableSave = true
    }

    const close = async () => {
      activeActivityLog.set('')
    }

    const closeDownloadData = async () => {
      showDownloadMessage = false
    }
    
    const applyChanges = (ev) => {
      activityLogFilterViewBy.set(viewByFilterControlDataSelected)
      activityLogFilterSelectSystem.set(selectSystemsFilterControlDataSelected)
      activityLogFilterRange.set(rangeFilterControlDataSelected)
      searchLogs()
      enableSave = false
    }

    onMount(() => {
      searchLogs()
    })
    
</script>

{#if $activeActivityLog == "activitylog"}
    <Modal
        title={$_("Recent Activity")}
        onClose={close}
    >
        <div class="activity-log-main-container">
            <div class="activity-log-panel-container">
                <div class="activity-log-panel">

                    <div class="activity-log-filter">
                        <ActivityLogFilter selectedData={viewByFilterControlDataSelected} label={$_("View By")} on:change={viewByChanged} displayData={viewByFilterControlData} allItemLabel="All Types" />
                    </div>
                    <div class="activity-log-filter">
                        <ActivityLogFilter selectedData={selectSystemsFilterControlDataSelected} label={$_("Select Systems")} on:change={selectSystemsChanged} displayData={selectSystemsFilterControlData} allItemLabel="All Systems" />
                    </div>
                    <div class="activity-log-filter">
                        <ActivityLogFilter selectedData={rangeFilterControlDataSelected} label={$_("Range")} on:change={rangeChanged}  displayData={rangeFilterControlData} allItemLabel="All Days" />
                    </div>
                    <div class="activity-log-filter">
                        <div class="activity-log-action">
                            <div class="empty-action-label">&nbsp</div>
                            <div>
                                <div class="activity-log-action-btn">
                                    <button class="button activity-log-apply" class:disabled={!enableSave} on:click={applyChanges}>
                                        {$_("Apply")}
                                    </button>
                                </div>
                                <div class="activity-log-download" on:click={() => showDownloadMessage = true}>
                                    <Icon icon='download' color='white' />                        
                                </div>                       
                        </div>
                    </div>
                        
                    </div>
                    <div>&nbsp;</div>
                </div>
            </div>
            <div class="activity-log-container">
                <div class="activity-log-grid-body">
                    <div class="activity-log-grid header">
                        <div>Type</div>
                        <div>Date/Time</div>
                        <div>Description</div>
                        <div>System</div>
                        <div>User</div>    
                    </div>
    
                    {#each $log as logData (logData.id)}
                        <div class="activity-log-grid item">
                            <div>  
                                <AlertChips type={logData.logLevel} />
                            </div>
                            <div>{logData.logCreated}</div>
                            <div>{logData.logText}</div>
                            <div>{logData.system}</div>
                            <div>{logData.logUser} 
                            </div>  
                        </div>
                    {/each}
    
                    {#if $log.length <= 0}
                        <div class="item mute">
                            <div class="no-record muted">{$_("No records found")}</div>
                        </div>
                    {/if}

                    <!-- {#each activityLogData as activityLogDataItem (activityLogDataItem.id)}
                    <div class="activity-log-grid item">
                        <div>  
                            <AlertChips type={activityLogDataItem.type} />
                        </div>
                        <div>{activityLogDataItem.datetime}</div>
                        <div>{activityLogDataItem.description}</div>
                        <div>{activityLogDataItem.system}</div>
                        <div>{activityLogDataItem.user}</div>  
                    </div>
                {/each} -->

                </div>

            </div>    
            <div class="activity-log-container- activity-log-footer">&nbsp;</div>
        </div>
    </Modal>
{/if}

{#if showDownloadMessage}
    <Modal
        title={$_("This feature is under development")}
        onClose={closeDownloadData}
    >
    </Modal>
{/if}

<style lang="scss">

    .activity-log-main-container {
    }

    .activity-log-header {
        padding: 5px 30px 5px 30px;
    }

    .activity-log-container {
        padding: 5px 30px 5px 30px;
    }

    .activity-log-grid {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
    }

    .activity-log-panel-container {
        padding: 5px 30px 5px 30px;
    }

    .activity-log-panel {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
    }

    .activity-log-filter {
        padding: 9px;
    }

    .empty-action-label {
        height: 50px;
    }

    .item {
        border: 1px solid #c2c2c2;
        padding: 20px 20px 20px 20px;
        margin-bottom: -1px;
    }

    .header {
        border-top: 1px solid #70777F;
        padding: 13px 20px 20px 20px;
        box-sizing: border-box;
    }

    .activity-log-download {
        padding-left: 20px;
        padding-top: 10px;
        vertical-align: middle;
        float: left;
        cursor: pointer;
    }

    .activity-log-action-btn {
        float: left;
    }

    .activity-log-apply {
        min-width: 170px;
    }

    .no-record {
        text-align: center;
        padding-top: 70px;
        padding-bottom: 70px;
    }

    :global(.modal-wrapper) {
        max-height: calc(85vh) !important;
    } 
</style>


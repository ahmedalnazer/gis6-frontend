<script>
    import _ from 'data/language'
    import ActivityLogFilter from './ActivityLogFilter.svelte'
    import AlertChips from './AlertChips.svelte'

    let activityLogData = []

    activityLogData.push({ id: 1, type: 'alert', datetime: '03/11/2021 7:32 AM', description: 'The machine is on fire', system: 'Hot Runner', user: '--' })
    activityLogData.push({ id: 2, type: 'warning', datetime: '03/11/2021 7:32 AM', description: 'The machine is on fire', system: 'Hot Runner', user: '--' })
    activityLogData.push({ id: 3, type: '', datetime: '03/11/2021 7:32 AM', description: 'The machine is on fire', system: 'Hot Runner', user: '--' })
    activityLogData.push({ id: 4, type: 'warning', datetime: '03/11/2021 7:32 AM', description: 'The machine is on fire', system: 'Hot Runner', user: '--' })
    activityLogData.push({ id: 5, type: 'warning', datetime: '03/11/2021 7:32 AM', description: 'The machine is on fire', system: 'Hot Runner', user: '--' })
    activityLogData.push({ id: 6, type: 'warning', datetime: '03/11/2021 7:32 AM', description: 'The machine is on fire', system: 'Hot Runner', user: '--' })
    activityLogData.push({ id: 7, type: 'warning', datetime: '03/11/2021 7:32 AM', description: 'The machine is on fire', system: 'Hot Runner', user: '--' })
    activityLogData.push({ id: 8, type: 'warning', datetime: '03/11/2021 7:32 AM', description: 'Description of change made. Lorem ipsum short dalor sit. Resolved.', system: 'Monitoring', user: 'Resolved by Todd Knight' })

    let viewByFilterData = []
    let selectSystemsFilterData = []
    let rangeFilterData = []

    const filterGridRefresh = () => {
      console.log('Refresh Grid')
    }
    
    const viewByChanged = (ev) => {
      viewByFilterData = ev.detail
      filterGridRefresh()
    }

    const selectSystemsChanged = (ev) => {
      selectSystemsFilterData = ev.detail
      filterGridRefresh()
    }

    const rangeChanged = (ev) => {
      rangeFilterData = ev.detail
      filterGridRefresh()
    }

</script>

<div>
    <div class="activity-log-header">
        <h2>
            Recent Activity
        </h2>
    </div>
    <div class="activity-log-panel-container">
        <div class="activity-log-panel">

            <div class="activity-log-filter">
                <ActivityLogFilter label={$_("View By")} on:change={viewByChanged} displayData={[ { id:0, name:'Alerts/Warnings' }, { id:1, name:'Changes' } ]} />
            </div>
            <div class="activity-log-filter">
                <ActivityLogFilter label={$_("Select Systems")} on:change={selectSystemsChanged} displayData={[ { id:0, name:'Balancing' }, { id:1, name:'Hot runner' }, { id:2, name:'Monitoring' }, { id:3, name:'Valve pin' } ]} />
            </div>
            <div class="activity-log-filter">
                <ActivityLogFilter label={$_("Range")} on:change={rangeChanged}  displayData={[ { id:0, name:'Last hour' }, { id:1, name:'Last 3 hrs' }, { id:2, name:'Last 8 hrs' }, { id:3, name:'Last 24 hrs' }, { id:4, name:'Last week' }, { id:5, name:'Last month' }, { id:6, name:'Last 3 months' } ]} />
            </div>
            <div class="activity-log-filter">
                <div>
                    <div class="empty-action-label">&nbsp</div>
                    <div>
                        <button class="button zone-type-apply" on:click={e => console.log("clicked")}>
                            {$_("Apply")}
                        </button>    
                    </div>
                </div>
            </div>
            <div>&nbsp;</div>
        </div>
    </div>
    <div class="activity-log-container">
        <div class="activity-log-grid header">
            <div>Type</div>
            <div>Date/Time</div>
            <div>Description</div>
            <div>System</div>
            <div>User</div>    
        </div>

        {#each activityLogData as activityLogDataItem (activityLogDataItem.id)}
            <div class="activity-log-grid item">
                <div>  
                    <AlertChips type={activityLogDataItem.type} />
                </div>
                <div>{activityLogDataItem.datetime}</div>
                <div>{activityLogDataItem.description}</div>
                <div>{activityLogDataItem.system}</div>
                <div>{activityLogDataItem.user}</div>  
            </div>
        {/each}


        <!-- <div class="activity-log-grid item">
            <div>  
                <AlertChips type='alert' />
            </div>
            <div>03/11/2021 7:32 AM</div>
            <div>The machine is on fire</div>
            <div>Hot Runner</div>
            <div>--</div>  
        </div>
        <div class="activity-log-grid item">
            <div>                
                <AlertChips type='warning' />
            </div>
            <div>03/10/2021 7:32 AM</div>
            <div>The machine is on fire</div>
            <div>Hot Runner</div>
            <div>--</div> 
        </div>
        <div class="activity-log-grid item">
            <div>                
                <AlertChips />
            </div>
            <div>03/10/2021 7:32 AM</div>
            <div>The machine is on fire</div>
            <div>Hot Runner</div>
            <div>--</div> 
        </div> -->
    </div>    
</div>

<style lang="scss">

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
        padding: 5px;
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

</style>


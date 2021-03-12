<script>
    import _ from 'data/language'
</script>

<div>
    <div>
        <h2>
            Recent Activity
        </h2>
    </div>
    <div class="activity-log-panel">
        <div>View By</div>
        <div>Select Systems</div>
        <div>Range</div>
        <div>
            <div>
                <label>&nbsp</label>
                <button class="button active zone-type-apply" on:click={e => console.log("clicked")}>
                    {$_("Apply")}
                </button>
            </div>
        </div>
        <div>&nbsp;</div>
    </div>
    <div class="activity-log-container">
        <div class="activity-log-grid header">
            <div>Type</div>
            <div>Date/Time</div>
            <div>Description</div>
            <div>System</div>
            <div>User</div>    
        </div>
        <div class="activity-log-grid">
            <div>Alert</div>
            <div>03/11/2021 7:32 AM</div>
            <div>The machine is on fire</div>
            <div>Hot Runner</div>
            <div>--</div>  
        </div>
        <div class="activity-log-grid">
            <div>Alert</div>
            <div>03/10/2021 7:32 AM</div>
            <div>The machine is on fire</div>
            <div>Hot Runner</div>
            <div>--</div> 
        </div>
    </div>    
</div>

<style lang="scss">
    .activity-log-container {
        padding: 30px;
    }

    .activity-log-grid {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
    }

    .activity-log-panel {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
    }
</style>


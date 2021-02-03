<script>
    import { onMount, beforeUpdate, afterUpdate, onDestroy } from "svelte";
    import Card from "@smui/card";
    import { Input, CheckBox } from "components";
    import Switch from "svelte-switch";
    import _ from "data/language";
</script>

<Card>
    <div class="section-header">
        <div class="section-order-header">Order Details</div>
    </div>
    <div class="section-body">
        <div class="zoneContainer">
            <div class="grid">
                <div>
                    <Input label={$_("Selected Process")} type="number" />
                </div>
                <div>
                    <Input label={$_("Order Number")} type="number" />
                </div>
                <div>
                    <Input
                        label={$_("Number of Shots/ Cycles/ Parts")}
                        type="number"
                    />
                </div>
                <div>

                    Shutdown GIS6 when complete
                    <div class="switch-container">
                        <div class="switch-left-text">{$_("On")}</div>
                        <div class="switch-control">
                            <Switch on:change={() => {}} onColor="#358cca" />
                        </div>
                        <div class="switch-right-text">
                            {$_("Off")}
                        </div>
                    </div>
                </div>
                <div>&nbsp;</div>
                <div class="done">
                    <button class="button ignore-task-styles active" on:click={e => {}}>
                      {$_("Done")}
                    </button>
                  </div>
            </div>
        </div>
    </div>
</Card>

<style>
    .grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 26px;
        align-items: center;
    }

    .zone-info {
        font-size: 14px;
        color: #70777f;
        text-align: left;
        line-height: 19px;
        padding-bottom: 10px;
    }

    .center {
        margin: auto;
        width: 80%;
        padding: 10px;
    }

    .section-header {
        padding: 5px;
    }

    .section-action {
        padding: 8px 8px 13px 8px;
    }

    .section-body {
        padding: 10px;
    }

    .item-section {
        padding: 1px;
        min-width: 150px;
        min-height: 68px;
        /* background-color: #70777f; */
    }

    .item-label {
        font-size: 0.7em;
    }

    .item-label-sub {
        font-size: 1em;
        color: #358dca;
    }

    .action-btn {
        font-size: 22px;
        padding: 12px;
        border: 2px solid #358dca;
        color: #358dca;
        background-color: #ffffff;
        cursor: pointer;
        min-width: 200px;
    }

    .action-button:hover {
        opacity: 0.8;
    }

    .action-button-raised {
        box-shadow: 0 3px 1px -2px rgba(0, 0, 0, 0.2),
            0 2px 2px 0 rgba(0, 0, 0, 0.14), 0 1px 5px 0 rgba(0, 0, 0, 0.12);
        transition: box-shadow 0.28s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .section-progress {
        display: inline-block;
        /* border: 1px solid #333333; */
        padding-top: 15px;
        padding-bottom: 10px;
    }

    .item-label-subsection {
        font-size: 12px;
        color: #358dca;
    }

    .section-order-header {
        margin-left: 3px;
        padding-top: 5px;
        font-size: 26px;
    }

    .time-left-progress {
        float: left;
        margin-top: -8px;
        padding-right: 5px;
    }

    .zone-section-gp {
        float: left;
        padding: 10px;
        border-left: 7px solid #358dca;
    }

    .zone-section-bp {
        float: left;
        padding: 10px;
        border-left: 7px solid #f06a1d;
    }

    .zone-section-time {
        float: left;
        padding: 10px;
        border-left: 7px solid #c2c2c2;
    }

    .zone-label-text {
        font-size: 2em;
        min-height: 60px;
    }

    .switch-container {
        align-items: center;
        display: flex;
        justify-content: center;
    }

    .switch-left-text {
        align-items: center;
        float: left;
        text-align: right;
        min-width: 50px;
    }
    .switch-control {
        align-items: center;
        float: left;
        padding: 5px;
        text-align: center;
    }
    .switch-right-text {
        align-items: center;
        float: left;
        min-width: 50px;
    }
</style>

<script>
    import { onMount, beforeUpdate, afterUpdate, onDestroy } from "svelte";
    import Card from "@smui/card";
    import { Input, Select } from "components";
    import Switch from "svelte-switch";
    import _ from "data/language";
    import api from "data/api";
    let processValue;

    const handleOrderFill = async () => {
        const data = await api.get(`order/?limit=1&status=n`);
        // http://cm:8000/api/order/?limit=1&status=n
        console.log("=====>data<======");
        console.log(data);
    }

</script>

<Card>
    <div class="section-header">
        <div class="section-order-header">Order Details</div>
    </div>
    <div class="section-body">
        <div class="zoneContainer">
            <div class="grid">
                <div>
                    <div class="select-process">
                        <label>{$_("Selected Process")}</label>
                        <Select
                            bind:value={processValue}
                            options={[
                                {
                                    id: "blackppleftdoor",
                                    name: "Black PP Left Door",
                                },
                            ]}
                            placeholder={$_("Select...")}
                            id="processValue"
                            getLabel={(u) => u.name}
                        />
                    </div>
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
                    <div class="switch-label">
                        {$_("Shutdown GIS6 when complete")}
                    </div>
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
                    <button
                        class="button ignore-task-styles active"
                        on:click={handleOrderFill}
                    >
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

    .section-header {
        padding: 5px;
    }

    .section-body {
        padding: 10px;
    }

    .section-order-header {
        margin-left: 3px;
        padding-top: 5px;
        font-size: 26px;
    }

    .switch-container {
        align-items: center;
        display: flex;
        justify-content: center;
        max-width: 220px;
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

    .switch-label {
        font-weight: 600;
        margin-top: -20px;
        padding-bottom: 10px;
    }

    .select-process {
        max-width: 250px;
    }
</style>

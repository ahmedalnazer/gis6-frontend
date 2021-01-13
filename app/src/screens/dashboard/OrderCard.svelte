<script>
    import { onMount, beforeUpdate, afterUpdate, onDestroy } from "svelte";
    import Card from "@smui/card";
    import language from "data/language/current";
    import ProgressBar from "@okrad/svelte-progressbar";
    import time from "data/time";
    let goodpartfrom = 0;
    let goodparttotal = 0;
    let badpartcount = 0;
    let hoursleft = 0;

    const apiEndpointUrl = "http://localhost:8000"; // TODO: Move to env
    let apitype = "API";
    let longPollingInterval = 5000;
    let progressStatus = 0;
    let orderId = 175;

    const dateOptions = { year: "numeric", month: "short", day: "numeric" };

    export let series = [
        {
            perc: 0,
            color: "#2196f3",
        },
    ];

    const getOrderCardData = () => {
        fetch(`${apiEndpointUrl}/system`)
            .then((response) => response.json())
            .then((data) => {
                if (data.order_id == orderId) {
                    goodpartfrom = data.good_cycles;
                    goodparttotal = data.target;
                    badpartcount = 0;
                    progressStatus = Math.round(
                        (goodpartfrom * 100) / goodparttotal + 0.01,
                        0
                    );

                    series = [progressStatus];
                }
            });
    };

    const startOrder = () => {
        fetch(`${apiEndpointUrl}/order/${orderId}/start/`, { method: "PUT" })
            .then((response) => {
                response.json();
            })
            .then((data) => {
                if ((apitype = "API")) {
                    setInterval(function () {
                        // Use long polling
                        // TODO: Move api to common place
                        getOrderCardData();
                    }, longPollingInterval);
                }
            });
    };

    onMount(() => {
        // if ((apitype = "API")) {
        //     setInterval(function () {
        //         // Use long polling
        //         // TODO: Move api to common place
        //         getOrderCardData();
        //     }, longPollingInterval);
        // }
    });

    const startOrderClick = () => {
        startOrder();
    };
</script>

<style>
    .zoneInfo {
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

    .sectionHeader {
        padding: 5px;
    }

    .sectionAction {
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
        font-size: 2em;
    }

    .item-label-sub {
        font-size: 0.8em;
    }

    .actionBtn {
        height: 40px;
        padding: 10px;
        border: 1px solid #358dca;
        color: #358dca;
        background-color: #ffffff;
        cursor: pointer;
    }

    .action-button:hover {
        opacity: 0.8;
    }

    .action-button-raised {
        box-shadow: 0 3px 1px -2px rgba(0, 0, 0, 0.2),
            0 2px 2px 0 rgba(0, 0, 0, 0.14), 0 1px 5px 0 rgba(0, 0, 0, 0.12);
        transition: box-shadow 0.28s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .sectionProgress {
        display: inline-block;
        /* border: 1px solid #333333; */
        padding-top: 15px;
        padding-bottom: 10px;
    }

    .item-label-subsection {
        font-size: 10px;
    }
</style>

<Card>
    <div class="sectionHeader">
        <div style="margin-left: 3px; padding-top:5px;">Order</div>
    </div>
    <div class="section-body">
        <div class="zoneContainer">
            <div class="zoneInfo">
                {new Date().toLocaleDateString($language, dateOptions)}
                {$time}
            </div>
            <div>
                <div
                    style="float:left; padding:10px; border-left: 5px solid #358dca;">
                    <div class="item-section">
                        <span class="item-label">{goodpartfrom}</span>
                        of
                        {goodparttotal}
                        <div class="item-label-sub">Good Parts</div>
                    </div>
                </div>
                <div
                    style="float:left; padding:10px; border-left: 5px solid #f06a1d;">
                    <div class="item-section">
                        <span style="font-size: 2em;">{badpartcount}</span>
                        <div class="item-label-sub">Bad Parts</div>
                    </div>
                </div>
                <div
                    style="float:left; padding:10px; border-left: 5px solid #c2c2c2;">
                    <div class="item-section">
                        <div style="float:left; margin-top: -4px;">
                            <ProgressBar
                                {series}
                                width={60}
                                bgFillColor="#FFFFFF"
                                style="radial"
                                thickness="14" />
                        </div>

                        <span style="font-size: 2em;">{hoursleft}</span>
                        <div class="item-label-sub">
                            Hours Left
                            <span class="item-label-subsection">(est.)</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="sectionProgress">
            <div>
                <ProgressBar
                    {series}
                    width={517}
                    thickness="1"
                    height="9"
                    textSize="20" />
            </div>
        </div>
        <div class="sectionAction">
            <div style="float:right;">
                <button
                    class="btn action-button action-button-raised actionBtn"
                    on:click={() => startOrderClick()}>
                    Start Order
                </button>

                <!-- <div>
                    <br/>
                    <button on:click={() => (series = [{
                        perc: 30,
                        color: '#2196f3'
                    }])}>fill</button>
                    <button on:click={() => (series = [100])}>Test Fill</button>
                    <button on:click={() => (series = [0])}>Test Clear</button>
                </div> -->
            </div>
        </div>
    </div>
</Card>

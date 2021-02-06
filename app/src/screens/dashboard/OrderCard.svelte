<script>
    import { onMount, beforeUpdate, afterUpdate, onDestroy } from "svelte";
    import Card from "@smui/card";
    import language from "data/language/current";
    import ProgressBar from "@okrad/svelte-progressbar";
    import time from "data/time";
    import api from "data/api";

    let goodpartfrom = 0;
    let goodparttotal = 0;
    let badpartcount = 0;
    let timeleft = "00.00";
    let intvl;

    let longPollingInterval = 5000;
    let progressStatus = 0;
    let orderId = 0;
    let orderStatus = "";

    const dateOptions = { year: "numeric", month: "short", day: "numeric" };

    export let series = [
        {
            perc: 0,
            color: "#2196f3",
        },
    ];

    const pad = (num) => {
        return ("0" + num).slice(-2);
    };

    const getTimeRemainingFormatted = (timeInSeconds) => {
        let minutes = Math.floor(timeInSeconds / 60);
        let seconds = timeInSeconds % 60;
        let hours = Math.floor(minutes / 60);
        minutes = minutes % 60;

        // let timewithsecond = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

        if (seconds >= 30) {
            minutes += 1;
        }
        return `${pad(hours)}:${pad(minutes)}`;
    };

    const getOrderCardData = async (isInit) => {
        const data = await api.get(`system`);

        if (isInit && orderId == 0) {
            let lastcompletedorder = await api.get(`/order/2000/lastcompleted/`);
            if (lastcompletedorder) {
                orderId = lastcompletedorder.id + 1
            }
        }

        if (data.order_id == orderId) {
            // For the first load show only few fields
            if (isInit) {
                goodparttotal = data.target;
                timeleft = getTimeRemainingFormatted(data.time_remain);
            } else {
                goodpartfrom = data.good_parts;
                goodparttotal = data.target;
                badpartcount = 0;
                progressStatus = Math.round(
                    (goodpartfrom * 100) / goodparttotal + 0.01,
                    0
                );
                timeleft = getTimeRemainingFormatted(data.time_remain);

                series = [progressStatus];

                if (progressStatus == 100) {
                    clearInterval(intvl);
                    orderStatus = "COMPLETE_ORDER";
                }
            }
        }

        // TODO: Remove the commented code after task is done
        // fetch(`${apiEndpointUrl}/system`)
        //     .then((response) => response.json())
        //     .then((data) => {
        //         if (data.order_id == orderId) {
        //             goodpartfrom = data.good_cycles;
        //             goodparttotal = data.target;
        //             badpartcount = 0;
        //             progressStatus = Math.round(
        //                 (goodpartfrom * 100) / goodparttotal + 0.01,
        //                 0
        //             );

        //             series = [progressStatus];
        //         }
        //     });
    };

    const startOrder = async () => {
        const data = await api.put(`order/${orderId}/start/`);

        intvl = setInterval(function () {
            // Use long polling
            getOrderCardData(false);
        }, longPollingInterval);

        orderStatus = "ORDER_STARTED";
    };

    const pauseOrder = async () => {
        await api.put(`order/${orderId}/pause/`);
        orderStatus = "PAUSED_ORDER";
    };

    const resumeOrder = async () => {
        await api.put(`order/${orderId}/resume/`);
        orderStatus = "RESUME_ORDER";
    };

    onMount(() => {
        getOrderCardData(true);
    });

    const orderActionClick = (currentOrderStatus) => {
        if (orderStatus == "") {
            startOrder();
        } else if (orderStatus == "ORDER_STARTED") {
            pauseOrder();
        } else if (orderStatus == "PAUSED_ORDER") {
            resumeOrder();
        } else if (orderStatus == "RESUME_ORDER") {
            orderStatus = "COMPLETE_ORDER";
        }
    };

    const manageOrderClick = () => {};

    onDestroy(() => clearInterval(intvl));
</script>

<Card>
    <div class="section-header">
        <div class="section-order-header">Order</div>
    </div>
    <div class="section-body">
        <div class="zoneContainer">
            <div class="zone-info">
                Modified {new Date().toLocaleDateString($language)}
                {$time}
            </div>
            <div>
                <div class="zone-section-gp">
                    <div class="item-section">
                        <div class="zone-label-text">
                            <span>{goodpartfrom}</span>
                            <span class="item-label">of
                                {goodparttotal}</span>
                            
                        </div>

                        <div class="item-label-sub">Good parts</div>
                    </div>
                </div>
                <div class="zone-section-bp">
                    <div class="item-section">
                        <div class="zone-label-text">{badpartcount}</div>
                        <div class="item-label-sub">Bad parts</div>
                    </div>
                </div>
                <div class="zone-section-time">
                    <div class="item-section">
                        <div class="time-left-progress">
                            <ProgressBar
                                {series}
                                width={60}
                                bgFillColor="#FFFFFF"
                                style="radial"
                                thickness="14"
                            />
                        </div>

                        <div class="zone-label-text">{timeleft}</div>
                        <div class="item-label-sub">
                            Hours/minutes left
                            <span class="item-label-subsection">(est.)</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="section-progress">
            <div>
                <ProgressBar
                    {series}
                    width={551}
                    thickness="1"
                    height="9"
                    textSize="20"
                />
            </div>
        </div>
        <div class="section-action">
            <div style="float:right;">
                {#if orderStatus == ""}
                    <button
                        class="btn action-button action-button-raised action-btn"
                        on:click={() => orderActionClick(orderStatus)}>
                        Start Order
                    </button>
                {:else if orderStatus == "ORDER_STARTED"}
                    <button
                        class="btn action-button action-button-raised action-btn"
                        on:click={() => orderActionClick(orderStatus)}>
                        Pause Order
                    </button>
                {:else if orderStatus == "PAUSED_ORDER"}
                    <button
                        class="btn action-button action-button-raised action-btn"
                        on:click={() => orderActionClick(orderStatus)}>
                        Resume Order
                    </button>
                {:else if orderStatus == "RESUME_ORDER"}
                    <button
                        class="btn action-button action-button-raised action-btn"
                        on:click={() => orderActionClick(orderStatus)}>
                        Complete Order
                    </button>
                {:else if orderStatus == "COMPLETE_ORDER"}
                    <button
                        class="btn action-button action-button-raised action-btn"
                        on:click={() => orderActionClick(orderStatus)}>
                        Complete Order
                    </button>
                {/if}

                <button
                    class="btn action-button action-button-raised action-btn"
                    on:click={() => manageOrderClick()}> Manage Order </button>
            </div>
        </div>
        <div class="section-footer">
            Processing Order Id: {orderId} 
        </div>
    </div>
</Card>

<style>
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
        font-size: .7em;
    }

    .item-label-sub {
        font-size: 1em;
        color: #358dca;
    }

    .action-btn {
        font-size: 22px;
        padding: 12px;
        border: 2px solid #358DCA;
        color: #358DCA;
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
        border-left: 7px solid #358DCA;
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

    .section-footer {
        clear: both;
        float: right;
        padding: 12px 10px 0px 10px;
        font-size: 14px;
        color: #c2c2c2;
        font-style: italic;
    }
</style>

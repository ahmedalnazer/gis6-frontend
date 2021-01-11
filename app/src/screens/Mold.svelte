<script>
    import Card from "@smui/card";
    import { onMount, beforeUpdate, afterUpdate, onDestroy } from "svelte";
    export let mouldDataItem = { title: "", itemDesc: "", itemImageUrl: "" };
    export let processDataItem = { title: "Manage Process", itemDesc: "", itemImageUrl: "" };
    export let isLayoutView = false;

    const apiEndpointUrl = "http://localhost:8000"; // TODO: Move to env
    let apitype = "API";
    let longPollingInterval = 5000;

    const getMoldData = () => {
        fetch(`${apiEndpointUrl}/mold`)
            .then((response) => response.json())
            .then((data) => {
                if (data.length) {
                    mouldDataItem.title = data[0].name;
                    mouldDataItem.itemDesc = data[0].part_name;
                    mouldDataItem.itemImageUrl = data[0].image;
                }
            });
    };

    const getProcessData = () => {
        fetch(`${apiEndpointUrl}/process`)
            .then((response) => response.json())
            .then((data) => {
                if (data.length) {
                    // processDataItem.title = data[0].name;
                    processDataItem.itemDesc = data[0].part_name;
                    processDataItem.itemImageUrl = data[0].image;
                }
            });
    };

    onMount(() => {
        if ((apitype = "API")) {
            setInterval(function () {
                // Use long polling
                // TODO: Move api to common place
                getMoldData();
                getProcessData();
            }, longPollingInterval);
        } 
        // else {
        //     socket.on("message", (data) => {
                
        //     });
        // }
    });

</script>

<style>
    .flexy {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
    }

    .flexor-content {
        flex-basis: 0;
        flex-grow: 1;
        overflow: auto;
    }

    .cardContainer {
        padding-top: 5px;
        padding-right: 5px;
    }

    .itemLeftContent {
        padding: 5px;
    }
    .itemDesc {
        color: #70777f;
        font-size: 14px;
    }

    .itemImage {
        width: 100%;
        height: 350px;
    }

    .layoutView {
        max-height: 130px;
        opacity:.4; 
        z-index: -1;
        cursor: move;
    }

</style>

{#if isLayoutView}
    <div class="layoutView">
        <Card style="width: 100%;">
            <div class="flexy cardContainer">
                <div class="flexor-content itemLeftContent">
                    <div>{mouldDataItem.title}</div>
                    <div class="itemDesc">{mouldDataItem.itemDesc}</div>
                </div>

                <div class="flexor-content itemImageUrl">
                    <!-- <img
                        src={mouldDataItem.itemImageUrl}
                        alt=""
                        class="itemImageLayout" /> -->
                </div>
            </div>
        </Card>
    </div>
{:else}
    <Card style="width: 100%;">
        <div class="flexy cardContainer">
            <div class="flexor-content itemLeftContent">
                <div>{mouldDataItem.title}</div>
                <div class="itemDesc">{mouldDataItem.itemDesc}</div>
            </div>

            <div class="flexor-content itemImageUrl">
                <!-- <Image src="{mouldDataItem.itemImageUrl}" /> -->
                <img
                    src={mouldDataItem.itemImageUrl}
                    alt=""
                    class="itemImage" />
            </div>
        </div>
    </Card>

    <Card style="width: 100%;">
        <div class="flexy cardContainer">
            <div class="flexor-content itemLeftContent">
                <div>{processDataItem.title}</div>
                <div class="itemDesc">{processDataItem.itemDesc}</div>
            </div>

            <div class="flexor-content itemImageUrl">
                <!-- <Image src="{mouldDataItem.itemImageUrl}" /> -->
                <img
                    src={processDataItem.itemImageUrl}
                    alt=""
                    class="itemImage" />
            </div>
        </div>
    </Card>
{/if}

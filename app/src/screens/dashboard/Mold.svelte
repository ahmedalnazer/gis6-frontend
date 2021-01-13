<script>
    import Card from "@smui/card";
    import api from "data/api";
    import { onMount, beforeUpdate, afterUpdate, onDestroy } from "svelte";
    export let mouldDataItem = { title: "Manage Mould", itemDesc: "", itemImageUrl: "" };
    export let processDataItem = { title: "Manage Process", itemDesc: "", itemImageUrl: "" };
    export let isLayoutView = false;

    let longPollingInterval = 5000;

    const getMoldData = async () => {
        const data = await api.get('mold')
        if (data && data.length) {
            // mouldDataItem.title = data[0].name;
            mouldDataItem.itemDesc = data[0].part_name;
            mouldDataItem.itemImageUrl = data[0].image;
        }
    };

    const getProcessData = async () => {
        const data = await api.get('process')
        if (data && data.length) {
            // processDataItem.title = data[0].name;
            processDataItem.itemDesc = data[0].part_name;
            processDataItem.itemImageUrl = data[0].image;
        }
    };

    let intvl

    onMount(() => {
        intvl = setInterval(() => {
            // Use long polling
            // TODO: Move api to common place
            getMoldData();
            getProcessData();
        }, longPollingInterval);
    })

    onDestroy(() => clearInterval(intvl)) 

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

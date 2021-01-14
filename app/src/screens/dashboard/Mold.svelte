<script>
    import Card from "@smui/card";
    import api from "data/api";
    import { onMount, beforeUpdate, afterUpdate, onDestroy } from "svelte";
    export let mouldDataItem = {
        title: "Manage Mould",
        itemDesc: "",
        itemImageUrl: "",
    };
    export let processDataItem = {
        title: "Manage Process",
        itemDesc: "",
        itemImageUrl: "",
    };
    export let isLayoutView = false;

    let hasMoldData = false;
    let hasProcessData = false;

    let longPollingInterval = 5000;

    const getMoldData = async () => {
        const data = await api.get("mold");
        if (data && data.length) {
            // mouldDataItem.title = data[0].name;
            mouldDataItem.itemDesc = data[0].part_name;
            mouldDataItem.itemImageUrl = data[0].image;
            hasMoldData = true;
        }
    };

    const getProcessData = async () => {
        const data = await api.get("process");
        if (data && data.length) {
            // processDataItem.title = data[0].name;
            processDataItem.itemDesc = data[0].part_name;
            processDataItem.itemImageUrl = data[0].image;
            hasProcessData = true;
        }
    };

    let intvl;

    onMount(() => {
        intvl = setInterval(() => {
            // Use long polling
            getMoldData();
            getProcessData();
        }, longPollingInterval);
    });

    onDestroy(() => clearInterval(intvl));
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
        opacity: 0.4;
        z-index: -1;
        cursor: move;
    }

    .mold-card-container {
        display: flex;
        width: 100%;
    }

    .mold-card-container-c1 {
        padding: 3px;
        flex: 1;
    }

    .no-data {
        color: grey;
        min-height: 130px;
        text-align: center;
        vertical-align: middle;
        padding: 40px;
    }
</style>

<div class="mold-card-container">
    {#if hasMoldData}
        <div class="mold-card-container-c1">
            <Card>
                <div class="flexy cardContainer">
                    <div class="flexor-content itemLeftContent">
                        <div>{mouldDataItem.title}</div>
                        <div class="itemDesc">{mouldDataItem.itemDesc}</div>
                    </div>
                    {#if mouldDataItem.itemImageUrl !== ''}
                    <div class="flexor-content itemImageUrl">
                        <img
                            src={mouldDataItem.itemImageUrl}
                            alt=""
                            class="itemImage" />
                    </div>
                    {/if}
                </div>
            </Card>
        </div>
    {:else}
        <div class="mold-card-container-c1">
            <Card>
                <div class="flexy cardContainer">
                    <div class="flexor-content itemLeftContent">
                        <div>{mouldDataItem.title}</div>
                        <div class="no-data">No data found</div>
                    </div>
                </div>
            </Card>
        </div>
    {/if}

    <!-- {#each errors || [] as e}
      <p transition:slide|local class='error'>{e}</p>
    {/each} -->

    {#if hasProcessData}
        <div class="mold-card-container-c1">
            <Card>
                <div class="flexy cardContainer">
                    <div class="flexor-content itemLeftContent">
                        <div>{processDataItem.title}</div>
                        <div class="itemDesc">{processDataItem.itemDesc}</div>
                    </div>
                    {#if processDataItem.itemImageUrl !== ''}
                        <div class="flexor-content itemImageUrl">
                            <img
                                src={processDataItem.itemImageUrl}
                                alt=""
                                class="itemImage" />
                        </div>
                    <!-- {:else}
                        <div class="flexor-content itemImageUrl">No Image</div> -->
                    {/if}
                </div>
            </Card>
        </div>
    {:else}
        <div class="mold-card-container-c1">
            <Card>
                <div class="flexy cardContainer">
                    <div class="flexor-content itemLeftContent">
                        <div>{processDataItem.title}</div>
                        <div class="no-data">No data found</div>
                    </div>
                </div>
            </Card>
        </div>
    {/if}
</div>

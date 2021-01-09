<script>
    import Card from "@smui/card";
    export let mouldDataItem = { title: "", itemDesc: "", itemImageUrl: "" };
    export let isLayoutView = false;
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
{/if}

<script>
    import Card from "@smui/card";
    export let managementDataItem = { title: "", itemDesc: "", itemImageUrl: "" };
    export let isLayoutView = false;
</script>

<style>
    .flexy {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        align-items: flex-start;
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
        padding-top:20px;
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
                    <div>{managementDataItem.title}</div>
                    <div class="itemDesc">{managementDataItem.itemDesc}</div>
                </div>

                <div class="flexor-content itemImageUrl">
                </div>
            </div>
        </Card>
    </div>
{:else}
    <Card style="width: 100%;">
        <div class="flexy cardContainer">
            <div class="flexor-content itemLeftContent">
                <div>{managementDataItem.title}</div>
                <div class="itemDesc">{managementDataItem.itemDesc}</div>
            </div>
        </div>
    </Card>
{/if}

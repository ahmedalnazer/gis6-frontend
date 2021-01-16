<script>
    import { defaultNames, groupColors } from "data/groups";
    import { Input } from "components";

    const handleEditGroupClick = () => {};
    const handleColorSelectedClick = () => {};
    export let name = "";
</script>

<style>
    .editGroupContainer {
        /* background-color: grey; */
        background-color: #ffffff;
        padding: 2px;
    }

    .editGroupBodyContainer {
        margin: 10px;
        display: flex;
    }

    .groupSection1 {
        padding: 5px;
        min-width: 300px;
    }

    .groupSection2 {
        padding: 10px 10px 10px 18px;
    }

    .groupLabel {
        padding-bottom: 10px;
        font-weight: 700;
    }

    .colorContainer {
        display: inline-block;
    }

    .colorTile {
        height: 40px;
        width: 40px;
        margin: 5px;
        float: left;
        cursor: pointer;
    }

    .colorTile:hover {
        opacity: 0.8;
    }

    .editGroupButton {
        clear: both;
        text-align: center;
        padding: 20px;
    }
    .sepOr {
        padding: 20px 20px 20px 2px;
    }
</style>

<div class="editGroupContainer">
    <div class="editGroupBodyContainer">
        <div class="groupSection1">
            <div class="groupLabel">Select a Group Name</div>

            <div>
                <select>
                    <option value="Custom">Custom</option>
                </select>
            </div>
            <div class="sepOr">or</div>
            <div class="groupLabel">Group Name</div>
            <div>
                <Input
                    value={name}
                    on:change={(e) => (name = e.target.value)} />
            </div>
        </div>

        <div class="groupSection2">
            <div class="groupLabel">Select Group Color</div>
            <div class="colorContainer">
                {#each groupColors || [] as color}
                    <div
                        class="colorTile"
                        style="background-color: {color}"
                        on:click={handleColorSelectedClick} />
                {/each}
            </div>
        </div>
    </div>

    <div class="editGroupButton">
        <button on:click={handleEditGroupClick} class="button active">
            Done
        </button>
    </div>
</div>

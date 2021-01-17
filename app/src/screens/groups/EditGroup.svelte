<script>
    import { defaultNames, groupColors } from "data/groups";
    import { Input } from "components";
    import { get_binding_group_value } from "svelte/internal";

    export let name = "";
    export let groupList = [];
    export let onClose;

    let validationError = "";
    let selectedColor = "";

    // $: console.log(selectedColor);

    const handleEditGroupClick = () => {
        // Validate form errors
        validationError = "";

        if (selectedColor == "" || name == "") {
            
            if (name == "" && selectedColor == "") {
                validationError = "Please enter/select group name and color";
            }
            else if(name == "") {
                validationError = "Please enter group name";
            }            
            else if (selectedColor == "") {
                validationError += "Please select the group color";
            }
        }
        else {
            // Close modal
            onClose();
        }
    };

    const handleColorSelectedClick = (e) => {
        selectedColor = e.target.getAttribute("data-color");
    };
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

    .editGroupMessage {
        padding: 15px;
        color: red;
        font-size: 22px;
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

    .colorSelected {
        border: 3px solid #FFE503;
        box-shadow: 2 2px 2px #FFE503;
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
    <div class="editGroupMessage">{validationError}</div>
    <div class="editGroupBodyContainer">
        <div class="groupSection1">
            <div class="groupLabel">Select a Group Name</div>
            <div>
                <select>
                    <option value="">-- Select One --</option>
                    {#each groupList || [] as grpLst}
                        <option value={grpLst.name}>{grpLst.name}</option>
                    {/each}
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
                        class={selectedColor === color ? 'colorTile colorSelected' : 'colorTile'}
                        style="background-color: {color}"
                        data-color={color}
                        on:click={handleColorSelectedClick} />
                {/each}
            </div>
        </div>
    </div>

    <div class="editGroupButton">
        <div on:click={handleEditGroupClick} class="button active">
            Done
        </div>

        <!-- <button on:click={handleEditGroupClick} class="button active">
            Done
        </button> -->
    </div>
</div>

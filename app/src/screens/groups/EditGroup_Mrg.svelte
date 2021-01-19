<script>
    import { onMount, beforeUpdate, afterUpdate, onDestroy } from "svelte";
    import groups from "data/groups";
    import { defaultNames, groupColors } from "data/groups";
    import { Input } from "components";
    import { get_binding_group_value } from "svelte/internal";
    import _ from "data/language";

    export let name = "";
    export let color = "";
    export let groupList = [];
    export let onClose;
    export let selectedGroupId = "";
    export let formType = "CREATE";

    let validationError = "";
    let selectedColor = "";
    let selectedGroup = "";
    let selectedColorInitial = "";

    $: name = selectedGroup;
    $: selectedColor = getSelectedColor(selectedGroup);

    onMount(() => {});

    // ====> Begin: Edit functions <====
    const getSelectedColor = (selGrp) => {
        let selectedColorItem = "";
        let selectedGrpItem = groupList.filter((x) => x.name == selGrp);
        if (selectedGrpItem.length) {
            selectedColorItem = selectedGrpItem[0].color;
            selectedGroupId = selectedGrpItem[0].id;
        }

        selectedColorInitial = selectedColorItem ? selectedColorItem : "";
        return selectedColorInitial;
    };

    const handleEditGroupClick = () => {
        // Validate form errors
        validationError = "";

        if (selectedGroup == "" || selectedColor == "" || name == "") {
            if (selectedGroup == "" && name == "" && selectedColor == "") {
                validationError = $_(
                    "Please enter/select 'Group Name', 'New Name' and 'Group Color'"
                );
            } else if (name == "") {
                validationError = $_("Please enter 'New Name'");
            } else if (selectedGroup == "") {
                validationError += $_("Please select the 'Group Name'");
            } else if (selectedColor == "") {
                validationError += $_("Please select the 'Group Color'");
            }
        } else if (
            name !== selectedGroup &&
            groupList.filter((x) => x.name.toLowerCase() == name.toLowerCase())
                .length > 0
        ) {
            validationError = $_(
                `Group Name ${name} already exist. Please select another name.`
            );
        } else if (
            selectedColorInitial !== selectedColor &&
            groupList.filter((x) => x.color == selectedColor).length > 0
        ) {
            validationError = $_(
                `Group Color is assigned to another group. Please select another color.`
            );
        } else {
            // Close modal
            color = selectedColor;
            onClose();
        }
    };

    const handleColorSelectedClick = (e) => {
        selectedColor = e.target.getAttribute("data-color");
    };
    // ====> End: Edit functions <====

    // ====> Begin: Create functions <====
    const handleEditGroupClick_C = () => {
        // Validate form errors
        validationError = "";

        if (selectedColor == "" || name == "") {
            if (name == "" && selectedColor == "") {
                validationError = $_(
                    "Please enter/select 'Group Name' and 'Group Color'"
                );
            } else if (name == "") {
                validationError = $_("Please enter 'Group Name'");
            } else if (selectedColor == "") {
                validationError += $_("Please select the 'Group Color'");
            }
        } else if (
            groupList.filter((x) => x.name.toLowerCase() == name.toLowerCase())
                .length > 0
        ) {
            validationError = $_(
                `Group Name ${name} already exist. Please select another name.`
            );
        } else if (
            groupList.filter((x) => x.color == selectedColor).length > 0
        ) {
            validationError = $_(
                `Group Color is assigned to another group. Please select another color.`
            );
        } else {
            // Close modal
            color = selectedColor;
            onClose();
        }
    };

    const handleColorSelectedClick_C = (e) => {
        selectedColor = e.target.getAttribute("data-color");
    };
    // ====> End: Create functions <====

    onDestroy(() => {});
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

    .required {
        color: red;
        font-size: 22px;
        font-weight: 700;
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
        border: 3px solid #ffe503;
        box-shadow: 2 2px 2px #ffe503;
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

{#if (formType = 'EDIT')}
    <!-- ========== EDIT ========== -->
    <div class="editGroupContainer">
        <div>{formType} dfdf </div>
        <div class="editGroupMessage">{validationError}</div>
        <div class="editGroupBodyContainer">
            <div class="groupSection1">
                <div class="groupLabel">
                    Select a Group Name
                    <span class="required">*</span>
                </div>
                <div>
                    <!-- svelte-ignore a11y-no-onchange -->
                    <select bind:value={selectedGroup}>
                        <option value="">-- Select One --</option>
                        {#each groupList || [] as grpLst}
                            <option value={grpLst.name}>{grpLst.name}</option>
                        {/each}
                    </select>
                    <div class="sepOr">or</div>
                    <div class="groupLabel">
                        New Name
                        <span class="required">*</span>
                    </div>
                </div>

                <div>
                    <Input
                        value={name}
                        on:change={(e) => (name = e.target.value)} />
                </div>
            </div>

            <div class="groupSection2">
                <div class="groupLabel">
                    Select Group Color
                    <span class="required">*</span>
                </div>
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
                {$_('Done')}
            </div>
        </div>
    </div>
{:else}
    <!-- ========== CREATE ========== -->
    <div class="editGroupContainer">
        <div>{formType} fff  ff </div>
        <div class="editGroupMessage">{validationError}</div>
        <div class="editGroupBodyContainer">
            <div class="groupSection1">
                <div class="groupLabel">Select a Group Name</div>
                <div>
                    <select>
                        <option value="">Custom</option>
                    </select>
                    <div class="sepOr">&nbsp;</div>
                    <div class="groupLabel">
                        Group Name
                        <span class="required">*</span>
                    </div>
                </div>

                <div>
                    <Input
                        value={name}
                        on:change={(e) => (name = e.target.value)} />
                </div>
            </div>

            <div class="groupSection2">
                <div class="groupLabel">
                    Select Group Color
                    <span class="required">*</span>
                </div>
                <div class="colorContainer">
                    {#each groupColors || [] as color}
                        <div
                            class={selectedColor === color ? 'colorTile colorSelected' : 'colorTile'}
                            style="background-color: {color}"
                            data-color={color}
                            on:click={handleColorSelectedClick_C} />
                    {/each}
                </div>
            </div>
        </div>

        <div class="editGroupButton">
            <div on:click={handleEditGroupClick_C} class="button active">
                {$_('Done')}
            </div>
        </div>
    </div>
{/if}

<script>
    import { onMount, beforeUpdate, afterUpdate, onDestroy } from "svelte"
    import groups from "data/groups"
    import { defaultNames, groupColors } from "data/groups"
    import { Input } from "components"
    import { get_binding_group_value } from "svelte/internal"
    import _ from "data/language"

    export let name = ""
    export let color = ""
    export let groupList = []
    export let defaultList
    export let onClose
    export let selectedGroupId = ""
    export let selectedGroupItem = ""
    export let selectedColorSingleItem = ""

    let validationError = ""
    let selectedColor = ""
    let selectedGroup = ""
    let selectedColorInitial = ""
    let groupListItems = []
    let singleItem = false

    $: name = selectedGroup
    $: selectedColor = getSelectedColor(selectedGroup)
    // $: selectedGroupItem, console.log(selectedGroupItem)

    onMount(() => {
      if (selectedGroupItem) {
        groupListItems = $groups.filter((x) => x.id == selectedGroupItem)
        if (groupListItems.length == 1) {
          selectedGroup = groupListItems[0].name
          selectedColorSingleItem = groupListItems[0].color
          selectedGroupId = groupListItems[0].id
          // selectedColor = selectedColorSingleItem;
          singleItem = true
        }
      } else {
        groupListItems = groupList
      }
    })

    const getSelectedColor = (selGrp) => {
      let selectedColorItem = ""
      let selectedGrpItem = groupList.filter((x) => {
        if (x.name !== undefined) {
          return x.name === selGrp
        } else {
          return x === [ selGrp ]
        }
      })

      if (selectedGrpItem.length) {
        selectedColorItem = selectedGrpItem[0].color
        selectedGroupId = selectedGrpItem[0].id
      }

      selectedColorInitial = selectedColorItem ? selectedColorItem : ""
      return selectedColorInitial
    }

    const handleEditGroupClick = () => {
      // Validate form errors
      validationError = ""
      if (singleItem) {
        selectedColor = selectedColorSingleItem
      }

      if (selectedGroup == "" || selectedColor == "" || name == "") {
        if (selectedGroup == "" && name == "" && selectedColor == "") {
          validationError =
                    "Please enter/select 'Group Name', 'New Name' and 'Group Color'"
        } else if (name == "") {
          validationError = "Please enter 'New Name'"
        } else if (selectedGroup == "") {
          validationError += "Please select the 'Group Name'"
        } else if (selectedColor == "") {
          validationError += "Please select the 'Group Color'"
        }
        // } else if (
        //       name !== selectedGroup &&
        //       (groupList.filter((x) => {
        //           if (x.name && name) {
        //               return x.name.toLowerCase() == name.toLowerCase();
        //           } else {
        //               return false;
        //           }
        //       }).length > 0 ||
        //       $groups.filter((x) => x.name == name && x.id !== selectedGroupId).length > 0)
        //   ) {
        //       validationError = `Group Name ${name} already exist. Please select another name.`;
        //   } 

      } else if (name.length > 12) {
        validationError += $_("'Group Name' cannot be longer than 12 characters")
      } else if (
        name !== selectedGroup &&
            (groupList.filter((x) => {
              if (x.name && name) {
                return x.name.trim().toLowerCase() == name.trim().toLowerCase()
              } else {
                return x.name == name
              }
            }).length > 0 ||
            $groups.filter((x) => 
            {
              if (x.name && name) {
                return x.name.trim().toLowerCase() == name.trim().toLowerCase() && x.id !== selectedGroupId
              } else {
                return x.name == name && x.id !== selectedGroupId
              }              
            }).length > 0)
      ) {
        validationError = `Group Name ${name} already exist. Please select another name.`
      } else if (
        selectedColorInitial !== selectedColor &&
            (groupList.filter((x) => x.color == selectedColor).length > 0 ||
                $groups.filter((x) => x.color == selectedColor && x.id !== selectedGroupId).length > 0)
      ) {
        validationError = `Group Color is assigned to another group. Please select another color.`
      } else {
        // Close modal
        color = selectedColor
        onClose()
      }
    }

    const handleColorSelectedClick = (e) => {
      selectedColor = e.target.getAttribute("data-color")
    }

    const handleColorSingleSelectedClick = (e) => {
      selectedColorSingleItem = e.target.getAttribute("data-color")
    }

    onDestroy(() => {})
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
        color: #B32024;
        font-size: 16px;
        line-height: 22px;
        font-weight: 600;
        letter-spacing: 0;
    }

    .required {
        color: #B32024;
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

<div class="editGroupContainer">
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
                    {#each defaultList || [] as grpLstItem}
                        <option value={grpLstItem}>
                            {grpLstItem}
                        </option>
                    {/each}
                </select>
                <div class="sepOr">or</div>
                <div class="groupLabel">
                    New Name
                    <span class="required">*</span>
                </div>
            </div>

            <div>
                <Input bind:value={name}/>
            </div>
        </div>

        <div class="groupSection2">
            <div class="groupLabel">
                Select Group Color
                <span class="required">*</span>
            </div>
            <div class="colorContainer">
                {#if singleItem}
                    {#each Object.entries(groupColors || {}) as [key, color]}
                        <div
                            class={selectedColorSingleItem === color ? 'colorTile colorSelected' : 'colorTile'}
                            style="background-color: {color};"
                            data-color={color}
                            on:click={handleColorSingleSelectedClick} />
                    {/each}
                {:else}
                    {#each Object.entries(groupColors || {}) as [key, color]}
                        <div
                            class={selectedColor === color ? 'colorTile colorSelected' : 'colorTile'}
                            style="background-color: {color};"
                            data-color={color}
                            on:click={handleColorSelectedClick} />
                    {/each}
                {/if}
            </div>
        </div>
    </div>

    <div class="editGroupButton">
        <div on:click={handleEditGroupClick} class="button active">
            {$_('Done')}
        </div>
    </div>
</div>

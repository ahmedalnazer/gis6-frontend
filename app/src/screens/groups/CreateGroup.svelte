<script>
  import groups from "data/groups"
  import { defaultNames, groupColors } from "data/groups"
  import { Input } from "components"
  import _ from "data/language"

  export let name = ""
  export let color = ""
  export let groupList = []
  export let onClose
  export let defaultList

  let _zones
  export { _zones as zones }
  let validationError = ""
  let selectedColor = ""
  let selectedGroup = ""
  let adding = true
  let selectedGroups = []

  $: groupIds = $groups.map((x) => x.id)
  $: console.log(`GID: ${groupIds}`)
  $: hasMaxGroup = $groups.length >= 10

  $: maxGroups = adding
    ? _zones
      .map(
        (z) =>
          [
            ...new Set(
              (z.groups || [])
                .filter((x) => groupIds.includes(x))
                .concat(selectedGroups)
            ),
          ].length
      )
      .reduce((max, cur) => cur > max ? cur : max, 0)
    : 0


  const handleEditGroupClick_Create = () => {
    // Validate form errors
    validationError = ""
    
    if (selectedGroup !== "__CUSTOM__") {
      name = selectedGroup
    }

    if (selectedColor == "" || name == "") {
      if (name == "" && selectedColor == "") {
        validationError = $_(
          "Please enter/select 'Group Name' and 'Group Color'"
        )
      } else if (name == "") {
        validationError = $_("Please enter 'Group Name'")
      } else if (selectedColor == "") {
        validationError += $_("Please select the 'Group Color'")
      } 
    } else if (name.length > 12) {
      validationError += $_("'Group Name' cannot be longer than 12 characters")
    } else if (
      groupList.filter((x) => (x.name || "").toLowerCase() == (name || "").toLowerCase())
        .length > 0
    ) {
      validationError = $_(
        `Group Name ${name} already exist. Please select another name.`
      )
    } else if (groupList.filter((x) => x.color == selectedColor).length > 0) {
      validationError = $_(
        `Group Color is assigned to another group. Please select another color.`
      )
    } else {
      // Close modal
      color = selectedColor
      onClose()
    }
  }

  const handleColorSelectedClick_Create = (e) => {
    selectedColor = e.target.getAttribute("data-color")
  }
</script>

<div class="editGroupContainer">
  <div class="message">
    {#if maxGroups >= 3}
      <p class="danger errorMessage">
        Part of your selection will exceed the maximum (3) number of groups
        and cannot be added to another.
      </p>
    {:else if hasMaxGroup}
      <p class="danger errorMessage">
        Reached a maximum of 10 groups. Unable to create additional group.
      </p>    
    {:else}
      <p class="danger errorMessage">
        {validationError}
      </p>
    {/if}
  </div>
  <div class="editGroupBodyContainer">
    <div class="groupSection1">
      <div class="groupLabel">{$_("Select a Group Name")}</div>
      <div>
        <select bind:value={selectedGroup}>
          <option value="">--Select One--</option>
          <option value="__CUSTOM__">Custom</option>
          {#each defaultList || [] as defaultNames}
            <option value={defaultNames}>{defaultNames}</option>
          {/each}
        </select>
        <div class="sepOr">&nbsp;</div>

        {#if selectedGroup == "__CUSTOM__"}
          <div class="groupLabel">
            {$_("Group Name")}
            <span class="required">*</span>
          </div>
          <div>
              <Input value={name} on:change={(e) => name = e.target.value} />
          </div>
        {/if}
      </div>
    </div>

    <div class="groupSection2">
      <div class="groupLabel">
        {$_("Select Group Color")}
        <span class="required">*</span>
      </div>
      <div class="colorContainer">
        {#each Object.entries(groupColors || {}) as [key, color]}
          <div
            class={selectedColor === color
              ? "colorTile colorSelected"
              : "colorTile"}
            style="background-color: {color}"
            data-color={color}
            on:click={handleColorSelectedClick_Create}
          />
        {/each}
      </div>
    </div>
  </div>

  <div class="editGroupButton">
    <div on:click={handleEditGroupClick_Create} class="button active" class:disabled={hasMaxGroup}>
      {$_("Done")}
    </div>
  </div>
</div>

<style>
  .editGroupContainer {
    background-color: #ffffff;
    padding: 2px;
  }

  .editGroupBodyContainer {
    margin: 10px;
    display: flex;
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

  .errorMessage {
    padding: 15px;
    color: #B32024;
    font-size: 16px;
    line-height: 22px;
    font-weight: 600;
    letter-spacing: 0;
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

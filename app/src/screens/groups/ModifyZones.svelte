<script>
  import groups from "data/groups"
  import _ from "data/language"
  import zones from "data/zones"
  import { Icon } from "components"

  let _zones
  export { _zones as zones }
  export let adding = false
  export let onCommit

  let selectedGroups = []
  const toggle = (id) => {
    if (selectedGroups.includes(id)) {
      selectedGroups = selectedGroups.filter((x) => x != id)
    } else {
      selectedGroups = selectedGroups.concat(id)
    }
  }

  let undo = []

  const commit = async () => {
    // console.log(_zones);
    undo = []
    for(let g of $groups.filter(x => selectedGroups.includes(x.id))) {
      console.log(g)
      if(adding) {
        await groups.addZones(g, _zones)
      } else {
        await groups.removeZones(g, _zones)
      }
      undo.push(() => groups.update({ ...g }))
    }
    // for (let z of _zones) {
    //   const curGroups = z.groups || []
    //   undo.push(() =>
    //     zones.update({ ...z, groups: curGroups }, { skipReload: true })
    //   )
    //   if (adding) {
    //     z.groups = curGroups.concat(selectedGroups)
    //   } else {
    //     z.groups = curGroups.filter((x) => !selectedGroups.includes(x))
    //   }
    //   z.groups = [ ...new Set(z.groups) ]
    //   await zones.update(z, { skipReload: true })
    // }
    selectedGroups = []
    // await zones.reload()
    // onCommit()
  }

  const commitUndo = async () => {
    for (let fn of undo) {
      await fn()
    }
    undo = []
    await zones.reload()
  }

  $: groupIds = $groups.map((x) => x.id)

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
  // $: console.log(maxGroups)
</script>

<div class="modify-zones">
  <div class="status-bar">
    {#if undo.length}
      <div class="undo link" on:click={commitUndo}>
        <Icon icon="undo" /> Undo
      </div>
    {/if}
    <div class="message">
      {#if maxGroups > 3}
        <p class="danger">
          Part of your selection will exceed the maximum (3) number of groups
          and cannot be added to another.
        </p>
      {/if}
    </div>
  </div>

  <div class="group-options">
    {#each $groups as group (group.id)}
      <div
        class="button"
        on:click={() => toggle(group.id)}
        class:active={selectedGroups.includes(group.id)}
      >
        {group.name}
      </div>
    {/each}
  </div>

  <div class="done">
    <div
      class="button active"
      on:click={commit}
      class:disabled={maxGroups > 3 || !selectedGroups.length}
    >
      {$_("Done")}
    </div>
  </div>
</div>

<style lang="scss">
  .group-options {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    grid-gap: 32px;
  }
  .done {
    text-align: center;
    margin-top: 64px;
  }
  .status-bar {
    min-height: 32px;
    margin-bottom: 32px;
    display: flex;
  }

  .undo {
    display: flex;
    align-items: center;
    margin-right: 16px;
    :global(svg) {
      width: 24px;
      margin-right: 8px;
    }
    :global(.icon-fill) {
      fill: var(--primary);
    }
  }
</style>

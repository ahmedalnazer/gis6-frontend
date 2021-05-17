<script>
  import ZoneBox from '../../../mini-controller/ZoneBox'
  import activeZones from 'data/zones/active'

  $: zones = $activeZones
</script>

<div class='mini'>
  {#each zones as z}
    <div class='zone'>
      <ZoneBox compact zone={z} />
    </div>
  {/each}
</div>

<style>
  .mini {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 8px;
  }
  .zone {
    margin-bottom: 4px;
  }
</style>

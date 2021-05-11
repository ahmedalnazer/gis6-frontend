<script>
  import ZoneBox from '../../../mini-controller/ZoneBox'
  import zones from 'data/zones'
</script>

<div class='mini'>
  {#each $zones as z}
    <ZoneBox compact zone={z} />
  {/each}
</div>

<style>
  .mini {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 9px;
  }
</style>

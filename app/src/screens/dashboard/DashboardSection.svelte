<script>
  import DragHeading from 'components/DragHeading.svelte'
  export let title
  export let editEnabled
</script>


<div class='dashboard-section'>
  <DragHeading {editEnabled}>{title}</DragHeading>

  <div class="section-body">
    <slot />
  </div>
</div>

<style>
  .dashboard-section {
    margin-bottom: 32px;
  }
</style>
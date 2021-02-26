<script>
  import DragHeading from 'components/DragHeading.svelte'
  export let title
</script>


<div class='dashboard-section'>
  <DragHeading>{title}</DragHeading>

  <div class="section-body">
    <slot />
  </div>
</div>

<style>
  .dashboard-section {
    margin-bottom: 32px;
  }
</style>
<script>
  import DragIndicator from 'style/images/DragIndicator.svelte'
</script>

<div class='drag-header'>
  <div class="drag-icon">
    <DragIndicator size="1.1em" />
  </div>
  <div class='title'>
    <slot />
  </div>
</div>

<style>
  .drag-header {
    display: flex;
    border-bottom: 1px solid #ddd;
    margin: 16px 0;
    font-weight: 600;
    align-items: center;
    padding-bottom: 8px;
  }
  .drag-icon {
    margin-left: -4px;
    margin-right: 8px;
  }
  .title {
    text-transform: uppercase;
    flex: 1;
  }
</style>

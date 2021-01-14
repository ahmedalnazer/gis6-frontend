<script>
  import DragIndicator from 'style/images/DragIndicator'
  export let title
</script>


<div class='dashboard-section'>
  <div class="section-title">
    <div class="dragIcon">
      <DragIndicator size="1.1em" />
    </div>
    <div>{title}</div>
  </div>

  <div class="section-body">
    <slot />
  </div>
</div>

<style>
  .section-title {
    display: flex;
    margin-bottom: 16px;
  }
</style>
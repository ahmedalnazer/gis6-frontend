<script>
  import DragHeading from 'components/DragHeading'
  export let title
</script>


<div class='dashboard-section'>
  <DragHeading>{title}</DragHeading>

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
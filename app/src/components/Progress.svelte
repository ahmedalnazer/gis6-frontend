<script>
  export let current = 0
  export let background = 'var(--gray)'
  export let color = 'var(--midBlue)'
  export let height = 20
</script>

<div class='progress'>
  <div class='total' style='background: {background}; height: {height}px'>
    <div class='current' style='width: {current}%; background: {color}; height: {height}px' />
  </div>
</div>

<style>
  .total {
    width: 100%;
    border-radius: 10px;
    overflow: hidden;
    position: relative;
  }
  .current {
    border-radius: 10px;
    position: absolute;
    top: 0;
    left: 0;
    transition: width .2s;
  }
</style>
<script>
  export let current = 0
  export let background = 'white'
  export let color = 'var(--midBlue)'
</script>

<div class='progress'>
  <div class='total' style='background: {background}'>
    <div class='current' style='width: {current}%; background: {color}' />
  </div>
</div>

<style>
  .total {
    width: 100%;
    height: 20px;
    border-radius: 10px;
    overflow: hidden;
    position: relative;
  }
  .current {
    height: 20px;
    border-radius: 10px;
    position: absolute;
    top: 0;
    left: 0;
    transition: width .2s;
  }
</style>
<script>
  import Card from './Card.svelte'
  import mold from 'data/mold'
</script>

<Card span={2}>
  <div class='container'>
    <div class='labels'>
      <h2>Mold</h2>
      <p class='muted'>{$mold.name}</p>
    </div>
    <div class='image'>
      <img src='/images/moldimages/mx232.png' />
    </div>
  </div>
</Card>
<script>
  import Card from './Card'
  import _ from 'data/language'
  import process from 'data/process'
  
</script>

<Card span={2}>
  <div class='container'>
    <div class='labels'>
      <h2>{$_('Part Picture')}</h2>
      <p class='muted'>{$process.name}</p>
    </div>
    <div class='image'>
      <img src='/images/moldimages/black_pp_left_door.png' />
    </div>
  </div>
</Card>
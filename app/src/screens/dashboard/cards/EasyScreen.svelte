<script>
  import Card from './Card.svelte'
  import _ from 'data/language'
  
</script>

<Card span={4} link='/easy-screen'>
  <h2>{$_('Easy Screen')}</h2>
</Card>

<style lang="scss">
  :global(.hot-runner-dash .card) {
    overflow: scroll;
    max-height: 340px;
  }
  </style>
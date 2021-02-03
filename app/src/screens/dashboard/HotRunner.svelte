<script>
  import Screen from 'layout/Screen.svelte';
  import Minicontroller from './cards/Minicontroller'
  import ZoneTasks from "components/taskbars/ZoneTasks"
  import _ from 'data/language'

</script>

<Screen title={$_('Hot Runner')}>
  <div slot="tasks">
    <ZoneTasks />
  </div>
  
  <div class='hot-runner-dash'>
    <Minicontroller />
  </div>
</Screen>
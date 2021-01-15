<script>
  import { Input } from 'components'
  import { defaultNames, groupColors } from 'data/groups'

  /**
   * defaultNames contains the list of names for the dropdown
   */

  export let onSubmit
  export let name = ''
  export let color = 1

  /**
   * name and color are bound to vars in the parent component, so all we 
   * need to do is update with the user's selections and submit the form (trigger onSubmit)
  */

</script>

<form on:submit|preventDefault={onSubmit}>
  CREATE GROUP
  <Input value={name} on:change={e => name = e.target.value} />
</form>
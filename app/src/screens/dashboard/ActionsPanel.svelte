<script>
    import { createEventDispatcher } from "svelte"
    // import Button, { Label } from "@smui/button";
    import user, { roles } from 'data/user'
    import _ from 'data/language'
    import { logIn } from 'data/user/actions'

    const dispatchSetupProduction = createEventDispatcher()
    let showSetupProductionButton = true

    const handleSetupProductionClick = () => {
      showSetupProductionButton = false
      dispatchSetupProduction("actionsPanel", { showSetupProductionButton })
    }
</script>

<div class="actionContainer">
  {#if $user && $user.id}
    {#if showSetupProductionButton}
        <button
            on:click={handleSetupProductionClick}
            class="button">
            SETUP PRODUCTION RUN
        </button>
        &nbsp;&nbsp;
    {/if}

    <button class="button">
        SHUTDOWN SYSTEM
    </button>
  {:else }
    <button class="button" on:click={e => logIn()}>
      {$_('LOG IN')}
    </button>
  {/if}
</div>

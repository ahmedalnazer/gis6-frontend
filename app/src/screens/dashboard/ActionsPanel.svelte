<script>
    import { createEventDispatcher } from "svelte";
    import Button, { Label } from "@smui/button";

    const dispatchSetupProduction = createEventDispatcher();
    let showSetupProductionButton = true;

    const handleSetupProductionClick = () => {
        showSetupProductionButton = false;
        dispatchSetupProduction("actionsPanel", { showSetupProductionButton });
    }
</script>

<div class="actionContainer">
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
</div>

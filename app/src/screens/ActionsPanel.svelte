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

<style lang="scss">
    .actionContainer {
        background-color: #40405e;
        padding: 10px 10px 10px 10px;
        display: flex;
        align-items: center;
    }

    .action-button {
        background-color: #687990;
        color: #ffffff;
        font-family: Roboto, sans-serif;
        -moz-osx-font-smoothing: grayscale;
        -webkit-font-smoothing: antialiased;
        font-size: 700;
        line-height: 2.25rem;
        font-weight: 550;
        letter-spacing: 0.08929em;
        text-decoration: none;
        text-transform: uppercase;
        padding: 10px 20px 10px 20px;
        display: inline-flex;
        position: relative;
        align-items: center;
        justify-content: center;
        box-sizing: border-box;
        min-width: 64px;
        height: 60px;
        border: none;
        outline: none;
        line-height: inherit;
        user-select: none;
        -webkit-appearance: none;
        overflow: hidden;
        vertical-align: middle;
        border-radius: 4px;
        cursor: pointer;
    }

    .action-button:hover {
        opacity: 0.8;
    }

    .action-button-raised {
        box-shadow: 0 3px 1px -2px rgba(0, 0, 0, 0.2),
            0 2px 2px 0 rgba(0, 0, 0, 0.14), 0 1px 5px 0 rgba(0, 0, 0, 0.12);
        transition: box-shadow 0.28s cubic-bezier(0.4, 0, 0.2, 1);
    }
</style>

<div class="actionContainer">
    {#if showSetupProductionButton}
        <button
            on:click={handleSetupProductionClick}
            class="action-button action-button-raised">
            SETUP PRODUCTION RUN
        </button>
        &nbsp;&nbsp;
    {/if}

    <button class="action-button action-button-raised">
        SHUTDOWN SYSTEM
    </button>
</div>

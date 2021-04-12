<script>
    import _ from 'data/language'
    import { onMount } from 'svelte'
    import Screen from "layout/Screen.svelte"

    onMount(() => { })
</script>

<Screen title={$_("Material Database")}>
    <div>
        <div class="material-subtitle">Search the material database to prefill the process with setpoints for the material.</div>
        <div class="material-form">
            <div>
                <div class="material-row1">
                    <div>Trade Name</div>
                </div>
            </div>
            <div>
                <div class="material-row2">
                    <div>Manufacturer</div>
                    <div>Family Abbreviation</div>
                </div>
            </div>    
        </div>
    </div>
</Screen>

<style>
    .material-form {
        display: grid;
        gap: 16px;
        grid-template-columns: repeat(1, 1fr);
    }

    .material-row1 {
        display: grid;
        gap: 16px;
        grid-template-columns: repeat(1, 1fr);
    }

    .material-row2 {
        display: grid;
        gap: 16px;
        grid-template-columns: repeat(2, 1fr);
    }

    .material-subtitle {
        padding-bottom: 30px;
    }
</style>
<script>
    import { onMount } from 'svelte'
    import { Modal } from "components"
    // import { activeSetpointEditor, openSetpointEditorVai } from 'data/setpoint'
    import { cardEditor, userCardPref } from 'data/user/cardpref'
    import _ from 'data/language'
    import CheckBox from "components/input/CheckBox.svelte"
    import user, { roles } from 'data/user'

    let userCardPrefStore = []

    const close = async () => {
        cardEditor.set(false)
    }

    const save = async () => {
        cardEditor.set(false)
        $userCardPref.filter(x => x.UserType == userType)
        userCardPref.set(userCardPrefStore)
    }

    let userCards = []
    $:userType = $user? $user.role: 0
    $: getUserCards(userType)

    const getUserCards = (userTypeId) => {
        // USER_TYPE_CHOICES = ((1, "admin"), (2, "operator"), (3, "process_engineer"), (4, "setup"), (5, "plant_manager") )
        userCardPrefStore = $userCardPref
        userCards = $userCardPref.filter(x => x.UserType == userTypeId)
        if (userCards.length > 0)
        {
            userCards = [...userCards[0].UserCards]
        }
    }

    onMount(() => { })
</script>

{#if $cardEditor == true}
    <Modal
        title={$_("Add Cards")}
        onClose={close}>
        <div class="card-pref-desc">Select the checkbox to add it's card to your dashboard then click 'Save' below. To remove a card from your view, simply uncheck it.</div>

        <div class="card-pref-container">
            <div class="card-pref-section">
                <div class="card-section-title">
                    Controller Functions
                </div>
                <div class="card-section-desc">
                    These controller functions are currently installed in the system. Use these cards to access the settings of each of the controllers.
                </div>
                <div>
                    {#each userCards.filter(x => x.CardType == 'CONTROLLER_FUNCTIONS') as userCard}
                        <div>
                            {#if userCard.Editable == true}
                                <CheckBox 
                                    label={$_(userCard.Title)}
                                    bind:checked={userCard.Enabled}
                                    disabled={!userCard.Editable}
                                />
                            {:else}
                                <CheckBox 
                                    label={$_(userCard.Title)}
                                    bind:checked={userCard.Enabled}
                                    disabled={!userCard.Editable}
                                    onClick={() => {}}
                                    />
                            {/if}
                        </div>
                    {/each}
                </div>
            </div>
            <div>
                <div class="card-section-title">
                    Mold, Process, Order
                </div>
                <div class="card-section-desc">
                    These options display live data and provide the ability to select zones and edit the process.
                </div>
                <div>
                    {#each userCards.filter(x => x.CardType == 'MOLD_PROCESS_ORDER') as userCard}
                    <div>
                        {#if userCard.Editable == true}
                            <CheckBox 
                                label={$_(userCard.Title)}
                                bind:checked={userCard.Enabled}
                                disabled={!userCard.Editable}
                            />
                        {:else}
                            <CheckBox 
                                label={$_(userCard.Title)}
                                bind:checked={userCard.Enabled}
                                disabled={!userCard.Editable}
                                onClick={() => {}}
                                />
                        {/if}
                    </div>
                    {/each}
                </div>
            </div>
            <div>
                <div class="card-section-title">
                    Tools & Diagnostics
                </div>
                <div class="card-section-desc">
                    These controller functions are currently installed in the system. Use these cards to access the settings of each of the controllers.
                </div>
                <div>
                    {#each userCards.filter(x => x.CardType == 'TOOLS_DIAGNOSTICS') as userCard}
                    <div>
                        {#if userCard.Editable == true}
                            <CheckBox 
                                label={$_(userCard.Title)}
                                bind:checked={userCard.Enabled}
                                disabled={!userCard.Editable}
                            />
                        {:else}
                            <CheckBox 
                                label={$_(userCard.Title)}
                                bind:checked={userCard.Enabled}
                                disabled={!userCard.Editable}
                                onClick={() => {}}
                                />
                        {/if}
                    </div>
                    {/each}
                </div>
            </div>
            <div>
                <div class="card-section-title">
                    General
                </div>
                <div class="card-section-desc">&nbsp;</div>
                <div>
                    {#each userCards.filter(x => x.CardType == 'GENERAL') as userCard}
                    <div>
                        {#if userCard.Editable == true}
                            <CheckBox 
                                label={$_(userCard.Title)}
                                bind:checked={userCard.Enabled}
                                disabled={!userCard.Editable}
                            />
                        {:else}
                            <CheckBox 
                                label={$_(userCard.Title)}
                                bind:checked={userCard.Enabled}
                                disabled={!userCard.Editable}
                                onClick={() => {}}
                                />
                        {/if}
                    </div>
                    {/each}
                </div>
            </div>

            <div>&nbsp;</div>
            <div class="savebtn">
                <div>
                    <button class="button active" on:click={() => save()}>
                        {$_("Save Selections")}
                    </button>
                </div>
            </div>
        </div>
    </Modal>
{/if}
  
<style lang="scss">

    .card-pref-container {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
    }

    .card-pref-desc {
        padding-bottom: 37px;
    }

    .card-section-title {
        font-size: 20px;
        font-weight: 600;
        letter-spacing: 0;
        line-height: 27px;
        padding-bottom: 20px;
    }

    .card-section-desc {
        padding-bottom: 30px;
        font-size: 16px;
        letter-spacing: 0;
        line-height: 22px;
    }

    .card-pref-section {
        padding-bottom: 40px;
    }

    .savebtn {
        > div {
            padding-top: 60px;
            float: right;
        }
    }

</style>

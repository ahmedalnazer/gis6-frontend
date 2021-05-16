<script>
  import Icon from "components/Icon.svelte"
  import { disableCard } from 'data/dashboards'

  export let link = undefined
  export let span = 1
  export let footerIcon = undefined
  export let cardEnabled = ''
  export let bigCard = ''
  export let smallCard = ''

  export let onClick = () => {}
  export let dashboard = ''
  export let group = ''
  export let name = ''
  export let title = ''
  export let icon = ''

  export let edit = false
  export let mandatory = false
</script>

<a href={edit ? undefined : link} data-id={name} on:click={onClick} class='card' class:cardEnabled class:bigCard class:smallCard style='grid-column: span {span};'>
  <div class='body'>
    {#if title && !$$slots.default}
      <div class='generic'>
        {#if icon} <Icon {icon}  color="#A0B7CE" size='24px'/> {/if}
        {#if title} <h2>{title}</h2> {/if}
      </div>
    {/if}
    <slot />
  </div>
  <div class='footer'>
    {#if footerIcon}
      <img src='/images/icons/expand.svg' alt='expand'/>
    {/if}
  </div>

  {#if edit}
    <div class="card-edit-placeholder" on:click={e => {e.stopPropagation(); e.preventDefault()}}>
      <h2>{title}</h2>
      <div>
        <Icon icon="move" color="#358DCA" />
        <span on:click={() => disableCard({ dashboard, group, card: name })}>
          {#if !mandatory}
            <Icon icon="trash" color="#358DCA" />
          {/if}
        </span>
      </div>
    </div>
  {/if}
</a>

<style lang="scss">
  a.card {
    color: inherit;
    display: flex;
    flex-direction: column;
    padding: 16px;
    min-height: 160px;
    position: relative;
  }
  a :global(h2) {
    padding: 0;
    margin: 0;
    margin-top: 10px;
    font-size: 20px;
  }
  a :global(p) {
    font-size: 14px;
    padding: 0;
    margin: 0;
    padding-bottom: 10px;
  }
  .body {
    flex: 1;
  }
  .generic {
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    padding-bottom: 22px;
  }
  .footer {
    display: flex;
    justify-content: flex-end;
  }

  .card-edit-placeholder {
    background: white;
    border: 2px solid var(--primary);
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    padding: 18px;
    h2 {
      margin: 0;
      flex: 1;
    }
    div {
      align-items: center;
      display: flex;
      justify-content: space-between;
    }
  }
</style>

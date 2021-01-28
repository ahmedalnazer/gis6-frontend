<script>
  import { Icon } from 'components'
  import { default as _user, roles } from 'data/user'
  export let user
  export let onDelete
</script>

<div class='card user-card'>
  <h3>{user.username}</h3>
  <p class='muted'>{roles[user.role]}</p>
  <div class='tools'>
    {#if onDelete && user.id != ($_user && $_user.id)}
      <div class='trash' on:click={() => onDelete(user)}>
        <Icon icon='trash' color='var(--primary)' />
      </div>
    {/if}
    <a class='profile-link' href='/user-profile/{user.id}'>
      <Icon icon='expand' color='var(--muted)' />
    </a>
  </div>
</div>

<style lang='scss'>
  .user-card {
    display: flex;
    flex-direction: column;
  }
  h3 {
    margin: 0;
    margin-bottom: 8px;
  }
  p {
    margin: 0;
  }
  .profile-link {
    color: var(--muted);
  }
  .tools {
    margin-top: auto;
    display: flex;
    .profile-link {
      margin-left: auto;
    }
    .trash {
      color: var(--primary);
    }
  }
</style>

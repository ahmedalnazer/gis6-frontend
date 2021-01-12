<script>
  import Screen from 'layout/Screen'
  import { users } from 'data/user'
  import { deleteUser } from 'data/user/actions'
  import _ from 'data/language'
  import Card from './Card'
  import { Modal } from 'components'

  let toDelete = null
  const commitDelete = async () => {
    await deleteUser(toDelete)
    toDelete = null
  }

</script>

<Screen title='{$_('Manage Users')}' class='manage-users'>
  <div class='user-grid'>
    {#each $users as user (user.id)}
      <Card {user} onDelete={id => toDelete = id} />
    {/each}
    <a href='/add-user' class='card user-card add-card'>
      +
    </a>
  </div>
  {#if toDelete}
    <Modal title={$_('Delete User')} onClose={() => toDelete = null}>
      <div class='modal'>
        <p>Are you sure you want to delete user {toDelete.username}? This is a permanent action and cannot be undone.</p>

        <div class='modal-buttons'>
          <div class='button' on:click={() => toDelete = null}>Cancel</div>
          <div class='button active' on:click={commitDelete}>Yes, delete user</div>
        </div>
      </div>
    </Modal>
  {/if}
</Screen>

<style lang='scss'>
  .user-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    grid-gap: 16px;
  }

  .user-grid :global(.user-card) {
    height: 180px;
  }

  .add-card {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 64px;
  }

  .modal {
    text-align: center;
  }
  .modal-buttons {
    margin-top: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    .button {
      margin: 32px;
    }
  }
</style>

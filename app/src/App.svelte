<script>
  import Router from './router/Router'
  import Notifications from 'components/utilities/Notifications'
  import Confirm from 'components/utilities/Confirm'
  import SplashScreen from "screens/SplashScreen";

  let showSplashScreen = true;
  

  import './style/main.scss'
</script>

{#if showSplashScreen}
  <SplashScreen on:splashScreen={(e) => { showSplashScreen = e.detail.showSplashScreen; }}/>
{:else}
  <Router />
{/if}
<Notifications />
<Confirm />

<script>
  import { onMount } from 'svelte'
  import Router from './router/Router.svelte'
  import Notifications from 'components/utilities/Notifications.svelte'
  import Confirm from 'components/utilities/Confirm.svelte'
  import SplashScreen from "screens/SplashScreen.svelte"
  import ActivityLog from "screens/activity-log/ActivityLog.svelte"
  import Header from 'layout/Header.svelte'
  import Footer from 'layout/Footer.svelte'
  import Login from 'screens/Login.svelte'
  import { loggingIn } from 'data/user/actions'
  import SetpointEditor from 'components/taskbars/commands/SetpointEditor.svelte'
  import createSocket from 'data/realtime/ws'
  import init from 'data/init'


  let showSplashScreen = true
  

  import './style/main.scss'
  onMount(() => {
    let showSplashScreenStore = localStorage.getItem("showSplashScreen")
    if (showSplashScreenStore === null) { showSplashScreen = true }
    else { showSplashScreen = showSplashScreenStore !== "false" }
    init()
    createSocket()
  })
</script>

<Header />
<!-- skip splash on internal screens -->
{#if showSplashScreen && window.location.pathname == '/'}
  <SplashScreen on:splashScreen={(e) => { showSplashScreen = e.detail.showSplashScreen }} />
{:else}
  <Router />
{/if}
<Footer />

{#if $loggingIn}
  <Login />
{/if}

<SetpointEditor />
<Notifications />
<Confirm />
<ActivityLog />

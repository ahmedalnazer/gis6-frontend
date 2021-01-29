<script>
  import Router from './router/Router'
  import Notifications from 'components/utilities/Notifications'
  import Confirm from 'components/utilities/Confirm'
  import SplashScreen from "screens/SplashScreen"
  import Header from 'layout/Header'
  import Footer from 'layout/Footer'
  import Login from 'screens/Login'
  import { loggingIn } from 'data/user/actions'
  import SetpointEditor from 'components/SetpointEditor'


  let showSplashScreen = true
  

  import './style/main.scss'
</script>

<Header />
<!-- skip splash on internal screens -->
{#if showSplashScreen && window.location.pathname == '/'}
  <SplashScreen on:splashScreen={(e) => { showSplashScreen = e.detail.showSplashScreen }}/>
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

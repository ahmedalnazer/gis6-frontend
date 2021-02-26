import Dashboard from 'screens/dashboard/Dashboard.svelte'
import ForgotPassword from 'screens/ForgotPassword.svelte'
import ManageUsers from 'screens/users/ManageUsers.svelte'
import AddUser from 'screens/users/AddUser.svelte'
import UserProfile from 'screens/users/UserProfile.svelte'
import GroupManagement from 'screens/groups/Manage.svelte'
import EditGroup from 'screens/groups/EditGroup.svelte'
import MiniController from 'screens/mini-controller/MiniController.svelte'
import EasyScreen from 'screens/easy-screen/EasyScreen.svelte'
import OrderFillin from 'screens/dashboard/OrderFillin.svelte'
import HotRunner from 'screens/dashboard/HotRunner.svelte'
import FaultAnalysis from 'screens/analysis/FaultAnalysis.svelte'
import WiringAnalysis from 'screens/analysis/WiringAnalysis.svelte'
import LinePlot from 'screens/charts/line-plot/LinePlot.svelte'

/**
 *
 * Routes can be added here, dynamic routes are supported, e.g.:
 *
 *    '/test/:foo': Component
 *
 * That route will match the url '/test/bar' and pass 'bar' as the 'foo' prop to `Component`
 *
 */
const routes = {
  '/': Dashboard,
  '/forgot-password': ForgotPassword,
  '/manage-users': ManageUsers,
  '/add-user': AddUser,
  '/user-profile/:userId': UserProfile,
  '/group-management': GroupManagement,
  '/edit-group': EditGroup,
  '/mini-controller': MiniController,
  '/easy-screen': EasyScreen,
  '/order-fillin': OrderFillin,
  '/hot-runner': HotRunner,
  '/analysis/fault': FaultAnalysis,
  '/analysis/wiring': WiringAnalysis,

  '/charts/line-plot': LinePlot
}

export default routes

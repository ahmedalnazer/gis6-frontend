import Dashboard from 'screens/dashboard/Dashboard'
import Login from 'screens/Login'
import ForgotPassword from 'screens/ForgotPassword'
import ManageUsers from 'screens/users/ManageUsers'
import AddUser from 'screens/users/AddUser'
import UserProfile from 'screens/users/UserProfile'
import GroupManagement from 'screens/groups/Manage'
import EditGroup from 'screens/groups/EditGroup'

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
  '/login': Login,
  '/forgot-password': ForgotPassword,
  '/manage-users': ManageUsers,
  '/add-user': AddUser,
  '/user-profile/:userId': UserProfile,
  '/group-management': GroupManagement,
  '/edit-group': EditGroup
}

export default routes

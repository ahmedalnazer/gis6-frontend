import Dashboard from 'screens/Dashboard'
import Login from 'screens/Login'
import ForgotPassword from 'screens/ForgotPassword'

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
  '/forgot-password': ForgotPassword
}

export default routes

const httpProxy = require('http-proxy')
const proxy = httpProxy.createServer({ target: 'http://localhost:8000' })
const extensions = require('rollup-plugin-extensions')

module.exports = {
  mount: {
    public: '/',
    src: '/_dist_',
  },
  plugins: [
    '@snowpack/plugin-svelte',
    '@snowpack/plugin-dotenv',
    '@snowpack/plugin-sass'
  ],
  // installOoptions: {
  //   packageLookupFields: [ "svelte", "module", "main" ]
  // },
  packageOptions: {
    /* ... */
    rollup: {
      plugins: [ 
        require('rollup-plugin-scss')(), 
        extensions({
          extensions: [ '.js', '.svelte', '.mjs' ]
        })
      ]
    }
  },
  routes: [
    {
      src: '/api/.*',
      dest: (req, res) => {
        proxy.web(req, res)
      }
    },
    { match: "routes", src: '.*', dest: '/index.html' }
  ],
  alias: {
    "components": "./src/components",
    "screens": "./src/screens",
    "data": "./src/data",
    "layout": "./src/layout",
    "router": "./src/router",
    "style": "./src/style"
    /* ... */
  },
}

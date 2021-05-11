const httpProxy = require('http-proxy')
const proxy = httpProxy.createServer({ target: 'http://localhost:8000' })


proxy.on('proxyReq', function(proxyReq, req) {
  // keep a ref
  req._proxyReq = proxyReq
})

// keep server up even if back end is unavailable
proxy.on('error', function(err, req, res) {
  if (req.socket.destroyed && err.code === 'ECONNRESET') {
    req._proxyReq.abort()
  }
})

module.exports = {
  mount: {
    public: '/',
    src: '/_dist_',
  },
  devOptions: {
    port: 8100,
    open: 'none'
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
        // require('rollup-plugin-scss')()
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

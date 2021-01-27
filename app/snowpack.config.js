console.log('TESTING CONFIG FILE')

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
  install: [
    /* ... */
  ],
  installOptions: {
    /* ... */
    rollup: {
      plugins: [ require('rollup-plugin-scss')() ]
    }
  },
  devOptions: {
    /* ... */
  },
  buildOptions: {
    /* ... */
  },
  proxy: {
    "/api": "http://localhost:8000/api",
    // "/ws": {
    //   target: "ws://localhost:5000",
    //   ws: true
    // }
  },
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

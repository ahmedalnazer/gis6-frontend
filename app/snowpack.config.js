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
      plugins: [require('rollup-plugin-scss')()]
    }
  },
  devOptions: {
    /* ... */
  },
  buildOptions: {
    /* ... */
  },
  proxy: {
    '/auth': "http://localhost:8000/auth"
  },
  alias: {
    "components": "./src/components",
    "screens": "./src/screens",
    "data": "./src/data",
    "layout": "./src/layout",
    "router": "./src/router"
    /* ... */
  },
}

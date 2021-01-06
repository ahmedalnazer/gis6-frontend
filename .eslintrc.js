module.exports = {
  parser: "babel-eslint",
  parserOptions: {
    ecmaVersion: 6,
    sourceType: "module"
  },
  env: {
    es6: true,
    browser: true
  },
  plugins: [
    "svelte3"
  ],
  overrides: [
    {
      files: [ "**/*.svelte" ],
      processor: "svelte3/svelte3"
    }
  ],
  rules: {
    "strict": 0,
    "semi": [ "error", "never", { "beforeStatementContinuationChars": "any" } ],
    "no-extra-parens": [ "error", "all" ],
    "arrow-spacing": "error",
    "indent": [ "error", 2 ],
    "object-curly-spacing": [ "error", "always", { "objectsInObjects": false } ],
    "array-bracket-spacing": [ "error", "always", { "arraysInArrays": false } ],
    "computed-property-spacing": [ "error", "never" ]
  },
  settings: {
    "svelte3/compiler": require('./app/node_modules/svelte/compiler'),
    "svelte3/ignore-styles": () => true,
    "svelte3/ignore-warnings": warning => {
      return false
    }
  }
}

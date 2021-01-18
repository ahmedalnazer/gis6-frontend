## GIS Front End

This is the GIS6 Front End web application developed using Svelte.

## Pre-requisites

The project toolchain is run using [NodeJS](https://nodejs.org/en/), a JavaScript runtime built on Chrome's V8 JavaScript engine. NPM is NodeJS package manager.

You’ll need to have Node >= 12 and npm >= 6 on your machine.  Please install Node using one of the install mechanisms for [your platform](https://nodejs.org/en/download/package-manager/).


## Installation

```bash
npm install
cd app
npm install
```

## Run development Server

```bash
cd app
npm start
```


## Run tests

```
# run tests in console
npm test

# Launches the test runner GUI in the interactive watch mode.
npm run show_tests  
```



## Available Scripts

From the project root directory, you can run:

### `cd app; npm start`

Runs the app in the development mode.<br />
Should open a browser tab at [http://localhost:8080](http://localhost:8080).

The development server offers HMR, detailed error messages and other useful development features. 

**NOTE: not for use in production**


### `cd app; npm run build`

Build to static files which can be served by Nginx in production


### `npm test`

Run cypress tests in headless mode.<br />

### `npm run show_tests`

Launches the test runner in the interactive watch mode.<br />





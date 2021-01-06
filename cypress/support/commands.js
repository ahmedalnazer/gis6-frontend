// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add("login", (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add("drag", { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add("dismiss", { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This is will overwrite an existing command --
// Cypress.Commands.overwrite("visit", (originalFn, url, options) => { ... })

import 'cypress-file-upload'

// Cypress.Commands.add("polyfillFetch", () => {
//   Cypress.log({})
//   // cypress only supports XHR Requests. https://docs.cypress.io/api/commands/route.html#Syntax
//   let polyfill
//   before(() => {
//     const polyfillUrl = 'https://unpkg.com/unfetch@4.1.0/dist/unfetch.umd.js'
//     cy.request(polyfillUrl).then(response => {
//       polyfill = response.body
//     })
//   })

//   Cypress.on('window:before:load', function(win) {
//     delete win.fetch
//     win.eval(polyfill)
//     win.fetch = (resource, init) => {
//       return win.unfetch(resource, init)
//     }
//   })
// })

Cypress.Commands.add('storeShared', (key, data) => {
  cy.writeFile(`cypress/tmp/${key}.json`, data)
})

Cypress.Commands.add('retrieveShared', (key) => {
  return cy.readFile(`cypress/tmp/${key}.json`)
})

Cypress.Commands.add('getUser', (create) => {
  const getRandomEmail = () => {
    return Math.random().toString(36).substring(2) + '@mailinator.com'
  }

  const freshUser = {
    email: getRandomEmail(),
    password: '1234567'
  }

  if(!create) {
    try {
      const user = cy.retrieveShared('user')
      if(user) {
        return user
      }
    } catch(e) {
      return cy.wrap(freshUser)
    }
    return cy.wrap(freshUser)
  }

  cy.storeShared('user', freshUser)
  return cy.wrap(freshUser)
})

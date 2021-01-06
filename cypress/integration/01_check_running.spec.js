/// <reference types="Cypress" />

context('Check that the app can load', () => {
  it('Check page structure', () => {
    cy.visit('/')
    cy.get('header')
      .should('be.visible')

    cy.get('footer')
      .scrollIntoView()
      .should('be.visible')
  })
})

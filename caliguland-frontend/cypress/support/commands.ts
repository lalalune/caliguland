/// <reference types="cypress" />

declare global {
  namespace Cypress {
    interface Chainable {
      joinGame(playerName: string): Chainable<void>;
      placeBet(outcome: 'YES' | 'NO', amount: number): Chainable<void>;
      postToFeed(content: string): Chainable<void>;
    }
  }
}

Cypress.Commands.add('joinGame', (playerName: string) => {
  cy.get('[data-cy="player-name-input"]').clear().type(playerName);
  cy.get('[data-cy="join-game-button"]').click();
});

Cypress.Commands.add('placeBet', (outcome: 'YES' | 'NO', amount: number) => {
  cy.get(`[data-cy="bet-${outcome.toLowerCase()}-button"]`).click();
  cy.get('[data-cy="bet-amount-slider"]').invoke('val', amount).trigger('input');
  cy.get('[data-cy="place-bet-button"]').click();
});

Cypress.Commands.add('postToFeed', (content: string) => {
  cy.get('[data-cy="post-input"]').clear().type(content);
  cy.get('[data-cy="post-button"]').click();
});

export {};


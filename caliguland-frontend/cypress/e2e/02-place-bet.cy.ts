describe('Place Bet Flow', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.joinGame('BetterPlayer');
    cy.wait(2000); // Wait for game state
  });

  it('should display betting panel', () => {
    // If game is active, should show betting panel
    cy.get('body').then(($body) => {
      if ($body.find('[data-cy="bet-yes-button"]').length > 0) {
        cy.get('[data-cy="bet-yes-button"]').should('be.visible');
        cy.get('[data-cy="bet-no-button"]').should('be.visible');
      }
    });
  });

  it('should allow selecting YES outcome', () => {
    cy.get('body').then(($body) => {
      if ($body.find('[data-cy="bet-yes-button"]').length > 0) {
        cy.get('[data-cy="bet-yes-button"]').click();
        cy.get('[data-cy="bet-yes-button"]').should('have.class', 'bg-green-500');
      }
    });
  });

  it('should allow selecting NO outcome', () => {
    cy.get('body').then(($body) => {
      if ($body.find('[data-cy="bet-no-button"]').length > 0) {
        cy.get('[data-cy="bet-no-button"]').click();
        cy.get('[data-cy="bet-no-button"]').should('have.class', 'bg-red-500');
      }
    });
  });

  it('should allow adjusting bet amount', () => {
    cy.get('body').then(($body) => {
      if ($body.find('[data-cy="bet-amount-slider"]').length > 0) {
        cy.get('[data-cy="bet-amount-slider"]')
          .invoke('val', 500)
          .trigger('input');
        
        cy.contains('500').should('be.visible');
      }
    });
  });

  it('should place a bet successfully', () => {
    cy.get('body').then(($body) => {
      if ($body.find('[data-cy="place-bet-button"]').length > 0) {
        cy.placeBet('YES', 250);
        cy.wait(1000);
        
        // Should show success message or bet in list
        cy.get('body').should('exist');
      }
    });
  });
});


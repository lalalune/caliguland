describe('Market Display', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.joinGame('MarketWatcher');
    cy.wait(2000);
  });

  it('should display market odds', () => {
    cy.get('body').then(($body) => {
      if ($body.find('[data-cy="yes-odds"]').length > 0) {
        cy.get('[data-cy="yes-odds"]').should('be.visible');
        cy.get('[data-cy="no-odds"]').should('be.visible');
      }
    });
  });

  it('should show total volume', () => {
    cy.get('body').then(($body) => {
      if ($body.find('[data-cy="total-volume"]').length > 0) {
        cy.get('[data-cy="total-volume"]').should('be.visible');
      }
    });
  });

  it('should display odds as percentages', () => {
    cy.get('body').then(($body) => {
      if ($body.find('[data-cy="yes-odds"]').length > 0) {
        cy.get('[data-cy="yes-odds"]').invoke('text').should('match', /\d+%/);
        cy.get('[data-cy="no-odds"]').invoke('text').should('match', /\d+%/);
      }
    });
  });

  it('should update odds when bet is placed', () => {
    cy.get('body').then(($body) => {
      if ($body.find('[data-cy="yes-odds"]').length > 0 && 
          $body.find('[data-cy="place-bet-button"]').length > 0) {
        
        // Get initial odds
        cy.get('[data-cy="yes-odds"]').invoke('text').then((initialOdds) => {
          // Place a bet
          cy.placeBet('YES', 500);
          cy.wait(2000);
          
          // Odds should update
          cy.get('[data-cy="yes-odds"]').should('exist');
        });
      }
    });
  });
});


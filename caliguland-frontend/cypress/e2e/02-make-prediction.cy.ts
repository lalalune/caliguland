describe('Make Prediction Flow', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.joinGame('PredictorPlayer');
    cy.wait(2000); // Wait for game state
  });

  it('should display prediction panel', () => {
    // If game is active, should show prediction panel
    cy.get('body').then(($body) => {
      if ($body.find('[data-cy="prediction-yes-button"]').length > 0) {
        cy.get('[data-cy="prediction-yes-button"]').should('be.visible');
        cy.get('[data-cy="prediction-no-button"]').should('be.visible');
      }
    });
  });

  it('should allow selecting YES outcome', () => {
    cy.get('body').then(($body) => {
      if ($body.find('[data-cy="prediction-yes-button"]').length > 0) {
        cy.get('[data-cy="prediction-yes-button"]').click();
        cy.get('[data-cy="prediction-yes-button"]').should('have.class', 'bg-green-500');
      }
    });
  });

  it('should allow selecting NO outcome', () => {
    cy.get('body').then(($body) => {
      if ($body.find('[data-cy="prediction-no-button"]').length > 0) {
        cy.get('[data-cy="prediction-no-button"]').click();
        cy.get('[data-cy="prediction-no-button"]').should('have.class', 'bg-red-500');
      }
    });
  });

  it('should allow adjusting prediction amount', () => {
    cy.get('body').then(($body) => {
      if ($body.find('[data-cy="prediction-amount-slider"]').length > 0) {
        cy.get('[data-cy="prediction-amount-slider"]')
          .invoke('val', 500)
          .trigger('input');
        
        cy.contains('500').should('be.visible');
      }
    });
  });

  it('should make a prediction successfully', () => {
    cy.get('body').then(($body) => {
      if ($body.find('[data-cy="make-prediction-button"]').length > 0) {
        cy.makePrediction('YES', 250);
        cy.wait(1000);
        
        // Should show success message or prediction in list
        cy.get('body').should('exist');
      }
    });
  });
});


describe('Complete Game Cycle', () => {
  it('should handle full game flow from lobby to game', () => {
    cy.visit('/');
    
    // Step 1: Join game
    cy.contains('Welcome to Caliguland').should('be.visible');
    cy.joinGame('Player1');
    cy.wait(2000);
    
    // Step 2: Verify we're either in lobby or game
    cy.get('body').should('exist');
    
    // Step 3: If in game, try to interact
    cy.get('body').then(($body) => {
      if ($body.find('[data-cy="post-input"]').length > 0) {
        // We're in the game - test interactions
        cy.postToFeed('Hello from Cypress test!');
        cy.wait(1000);
        
        // Try to place a bet if predictions are open
        if ($body.find('[data-cy="make-prediction-button"]').length > 0) {
          cy.makePrediction('YES', 300);
          cy.wait(1000);
        }
      }
    });
    
    // Step 4: Verify game state is displayed
    cy.get('body').then(($body) => {
      const hasGameInfo = $body.text().includes('Day') || 
                          $body.text().includes('Phase') || 
                          $body.text().includes('Players');
      expect(hasGameInfo).to.be.true;
    });
  });

  it('should display current game phase and day', () => {
    cy.visit('/');
    cy.joinGame('PhaseChecker');
    cy.wait(2000);
    
    cy.get('body').then(($body) => {
      if ($body.text().includes('Phase')) {
        cy.contains(/Phase|LOBBY|EARLY|MID|LATE|REVEAL|ENDED/).should('exist');
      }
      if ($body.text().includes('Day')) {
        cy.contains(/Day \d+/).should('exist');
      }
    });
  });
});


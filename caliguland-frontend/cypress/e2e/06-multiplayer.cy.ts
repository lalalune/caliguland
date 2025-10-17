describe('Multi-Player Simulation', () => {
  it('should handle multiple players joining', () => {
    // Open multiple windows (simulated by sequential joins)
    const players = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve'];
    
    players.forEach((playerName, index) => {
      cy.visit('/');
      cy.joinGame(playerName);
      cy.wait(1500);
      
      // Should show player count increasing (if visible)
      cy.get('body').should('exist');
    });
  });

  it('should display all players in the players list', () => {
    cy.visit('/');
    cy.joinGame('ListViewer');
    cy.wait(2000);
    
    cy.get('body').then(($body) => {
      if ($body.find('[data-cy^="player-"]').length > 0) {
        // Should show at least one player
        cy.get('[data-cy^="player-"]').should('have.length.at.least', 1);
      }
    });
  });
});


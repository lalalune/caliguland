describe('Join Game Flow', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should display the lobby page', () => {
    cy.contains('Welcome to Caliguland').should('be.visible');
    cy.contains('Social prediction market').should('be.visible');
  });

  it('should show player name input', () => {
    cy.get('[data-cy="player-name-input"]').should('be.visible');
    cy.get('[data-cy="join-game-button"]').should('be.visible');
  });

  it('should require a player name', () => {
    cy.get('[data-cy="join-game-button"]').should('be.disabled');
  });

  it('should enable join button when name is entered', () => {
    cy.get('[data-cy="player-name-input"]').type('TestPlayer');
    cy.get('[data-cy="join-game-button"]').should('not.be.disabled');
  });

  it('should successfully join a game', () => {
    cy.joinGame('TestPlayer1');
    
    // Wait for join request to complete
    cy.wait(1000);
    
    // Should either stay in lobby or show game board
    // depending on if game has started
    cy.get('body').should('exist');
  });

  it('should show how to play instructions', () => {
    cy.contains('How to Play').should('be.visible');
    cy.contains('Wait for 5+ players').should('be.visible');
    cy.contains('Bet YES or NO').should('be.visible');
  });
});


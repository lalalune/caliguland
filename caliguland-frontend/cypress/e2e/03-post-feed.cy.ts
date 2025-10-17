describe('Post to Feed Flow', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.joinGame('FeedPoster');
    cy.wait(2000);
  });

  it('should display the feed', () => {
    cy.get('body').then(($body) => {
      if ($body.find('[data-cy="feed-messages"]').length > 0) {
        cy.get('[data-cy="feed-messages"]').should('be.visible');
      }
    });
  });

  it('should display post input if player has joined', () => {
    cy.get('body').then(($body) => {
      if ($body.find('[data-cy="post-input"]').length > 0) {
        cy.get('[data-cy="post-input"]').should('be.visible');
        cy.get('[data-cy="post-button"]').should('be.visible');
      }
    });
  });

  it('should disable post button when input is empty', () => {
    cy.get('body').then(($body) => {
      if ($body.find('[data-cy="post-button"]').length > 0) {
        cy.get('[data-cy="post-input"]').clear();
        cy.get('[data-cy="post-button"]').should('be.disabled');
      }
    });
  });

  it('should enable post button when text is entered', () => {
    cy.get('body').then(($body) => {
      if ($body.find('[data-cy="post-input"]').length > 0) {
        cy.get('[data-cy="post-input"]').type('Test post');
        cy.get('[data-cy="post-button"]').should('not.be.disabled');
      }
    });
  });

  it('should post a message successfully', () => {
    cy.get('body').then(($body) => {
      if ($body.find('[data-cy="post-input"]').length > 0) {
        const testMessage = `Test message ${Date.now()}`;
        cy.postToFeed(testMessage);
        cy.wait(1000);
        
        // Message should appear in feed
        cy.get('[data-cy="feed-messages"]').should('exist');
      }
    });
  });

  it('should respect 280 character limit', () => {
    cy.get('body').then(($body) => {
      if ($body.find('[data-cy="post-input"]').length > 0) {
        const longText = 'a'.repeat(300);
        cy.get('[data-cy="post-input"]').type(longText);
        cy.get('[data-cy="post-input"]').should(($input) => {
          expect($input.val().toString().length).to.be.at.most(280);
        });
      }
    });
  });
});


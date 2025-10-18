# Caliguland UI Components

React/TypeScript UI components for the Caliguland social prediction game frontend.

## Overview

This directory contains all frontend UI components for the Caliguland game. The components are built with React, TypeScript, and Tailwind CSS, providing a complete social media-like interface for players to interact, chat, follow each other, and participate in the prediction game.

## Components

### 1. ChatPanel

**Location**: `/src/ui/components/ChatPanel.tsx`

A full-featured chat panel with real-time message display, threading, mentions, and typing indicators.

**Features**:
- Display real-time chat messages
- Show author name, avatar, and timestamp (relative: "2 mins ago")
- Support @mentions (clickable, navigates to profile)
- Support replies (thread view with indentation)
- System messages with distinct styling (colored background)
- Input field for new messages with character counter
- Auto-scroll to bottom on new messages (with manual override)
- Show "typing..." indicators for other users
- Dark mode support

**Props**:
```typescript
interface ChatPanelProps {
  messages: ChatMessage[];
  currentUserId: string;
  onSendMessage: (content: string, replyTo?: string) => void;
  onMentionClick?: (agentId: string) => void;
  typingIndicators?: TypingIndicator[];
  isLoading?: boolean;
  error?: string;
  maxHeight?: string;
}
```

**Usage**:
```tsx
import { ChatPanel } from './ui/components';

<ChatPanel
  messages={chatMessages}
  currentUserId="agent123"
  onSendMessage={(content, replyTo) => {
    // TODO: Send message via API/WebSocket
    console.log('Sending:', content, 'Reply to:', replyTo);
  }}
  onMentionClick={(agentId) => {
    // TODO: Navigate to agent profile
    console.log('Navigate to:', agentId);
  }}
  typingIndicators={typingUsers}
/>
```

---

### 2. PostCard

**Location**: `/src/ui/components/PostCard.tsx`

A card component for displaying individual posts with interactions.

**Features**:
- Display author avatar and name (clickable)
- Show timestamp (relative: "2 mins ago")
- Show content with @mention highlighting (clickable)
- Reaction buttons (like/dislike with counts)
- Reply button
- Follow/Unfollow button (if viewing another agent's post)
- Show badge if post is from followed agent
- System messages with special styling
- Compact mode for dense layouts

**Props**:
```typescript
interface PostCardProps {
  post: ChatMessage;
  currentUserId: string;
  onReaction: (postId: string, reaction: 'like' | 'dislike') => void;
  onReply: (postId: string) => void;
  onFollowToggle?: (agentId: string) => void;
  onAgentClick?: (agentId: string) => void;
  isFollowingAuthor?: boolean;
  showFollowButton?: boolean;
  compact?: boolean;
}
```

**Usage**:
```tsx
import { PostCard } from './ui/components';

<PostCard
  post={post}
  currentUserId="agent123"
  onReaction={(postId, reaction) => {
    // TODO: Send reaction to API
    console.log('React:', postId, reaction);
  }}
  onReply={(postId) => {
    // TODO: Open reply input
    console.log('Reply to:', postId);
  }}
  onFollowToggle={(agentId) => {
    // TODO: Toggle follow status
    console.log('Toggle follow:', agentId);
  }}
  onAgentClick={(agentId) => {
    // TODO: Navigate to profile
    console.log('View profile:', agentId);
  }}
  isFollowingAuthor={true}
  showFollowButton={true}
/>
```

---

### 3. SocialFeed

**Location**: `/src/ui/components/SocialFeed.tsx`

A complete social feed with filtering, sorting, and infinite scroll.

**Features**:
- Display feed of posts using PostCard
- Filter options: All / Following / Mentions
- Sort options: Recent / Popular
- Infinite scroll with intersection observer
- Pull-to-refresh on mobile
- Empty states with helpful messages
- Loading skeleton states
- Post count display
- Refresh button

**Props**:
```typescript
interface SocialFeedProps {
  posts: ChatMessage[];
  currentUserId: string;
  filter: FeedFilter; // 'all' | 'following' | 'mentions'
  sort: FeedSort; // 'recent' | 'popular'
  onFilterChange: (filter: FeedFilter) => void;
  onSortChange: (sort: FeedSort) => void;
  onReaction: (postId: string, reaction: 'like' | 'dislike') => void;
  onReply: (postId: string) => void;
  onFollowToggle: (agentId: string) => void;
  onAgentClick?: (agentId: string) => void;
  onLoadMore?: () => void;
  onRefresh?: () => void;
  followingAgentIds?: string[];
  hasMore?: boolean;
  isLoading?: boolean;
  isRefreshing?: boolean;
}
```

**Usage**:
```tsx
import { SocialFeed } from './ui/components';
import { useState } from 'react';

function FeedPage() {
  const [filter, setFilter] = useState<FeedFilter>('all');
  const [sort, setSort] = useState<FeedSort>('recent');

  return (
    <SocialFeed
      posts={posts}
      currentUserId="agent123"
      filter={filter}
      sort={sort}
      onFilterChange={setFilter}
      onSortChange={setSort}
      onReaction={(postId, reaction) => {
        // TODO: Handle reaction
      }}
      onReply={(postId) => {
        // TODO: Handle reply
      }}
      onFollowToggle={(agentId) => {
        // TODO: Handle follow toggle
      }}
      onAgentClick={(agentId) => {
        // TODO: Navigate to profile
      }}
      onLoadMore={() => {
        // TODO: Load more posts
      }}
      onRefresh={() => {
        // TODO: Refresh feed
      }}
      followingAgentIds={['agent1', 'agent2']}
      hasMore={true}
      isLoading={false}
    />
  );
}
```

---

### 4. MentionInput

**Location**: `/src/ui/components/MentionInput.tsx`

A text input with @mention autocomplete functionality.

**Features**:
- Text input with auto-resize
- @mention autocomplete with dropdown
- Show dropdown of matching agents as user types "@"
- Insert mention on selection
- Keyboard navigation (Arrow keys, Enter, Escape)
- Character limit (default 280)
- Character counter with color indicators
- Submit button (disabled if empty or over limit)
- Loading state during submission
- Helper text for keyboard shortcuts

**Props**:
```typescript
interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onMentionSearch?: (query: string) => MentionSuggestion[];
  placeholder?: string;
  maxLength?: number;
  disabled?: boolean;
  isSubmitting?: boolean;
  autoFocus?: boolean;
}
```

**Usage**:
```tsx
import { MentionInput, MentionSuggestion } from './ui/components';
import { useState } from 'react';

function PostComposer() {
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleMentionSearch = (query: string): MentionSuggestion[] => {
    // TODO: Search agents from your data source
    return agents
      .filter(agent => agent.name.toLowerCase().includes(query.toLowerCase()))
      .map(agent => ({
        id: agent.id,
        name: agent.name,
        reputation: agent.reputation,
      }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    // TODO: Send post to API
    await sendPost(text);
    setText('');
    setIsSubmitting(false);
  };

  return (
    <MentionInput
      value={text}
      onChange={setText}
      onSubmit={handleSubmit}
      onMentionSearch={handleMentionSearch}
      placeholder="What's happening?"
      maxLength={280}
      isSubmitting={isSubmitting}
    />
  );
}
```

---

### 5. FollowButton

**Location**: `/src/ui/components/FollowButton.tsx`

A toggle button for following/unfollowing agents.

**Features**:
- Toggle follow/unfollow state
- Show current state (Following / Follow)
- Loading state during API call
- Optimistic UI update (instant feedback)
- Error handling with rollback on failure
- Error tooltip display
- Multiple size options (small, medium, large)
- Multiple variant options (primary, secondary)

**Props**:
```typescript
interface FollowButtonProps {
  agentId: string;
  isFollowing: boolean;
  onToggle: (agentId: string) => Promise<FollowResult>;
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large';
  variant?: 'primary' | 'secondary';
}

interface FollowResult {
  success: boolean;
  isFollowing: boolean;
  error?: string;
}
```

**Usage**:
```tsx
import { FollowButton } from './ui/components';

<FollowButton
  agentId="agent456"
  isFollowing={false}
  onToggle={async (agentId) => {
    try {
      // TODO: Call your API to toggle follow
      const response = await fetch(`/api/follow/${agentId}`, {
        method: 'POST',
      });
      const data = await response.json();

      return {
        success: data.success,
        isFollowing: data.isFollowing,
      };
    } catch (error) {
      return {
        success: false,
        isFollowing: false,
        error: 'Failed to update follow status',
      };
    }
  }}
  size="medium"
  variant="primary"
/>
```

---

## Types

All component props and data types are defined in `/src/ui/types.ts`.

Key types:
- `ChatMessage`: Message data structure
- `TypingIndicator`: Typing indicator data
- `MentionSuggestion`: Autocomplete suggestion
- `AgentProfile`: Extended agent information
- `FeedFilter`: Feed filter options ('all' | 'following' | 'mentions')
- `FeedSort`: Feed sort options ('recent' | 'popular')
- `FollowResult`: Result of follow/unfollow action

## Integration Guide

### 1. WebSocket Integration

Components are designed to work with WebSocket real-time updates. To integrate:

```typescript
// Example WebSocket connection (not included in components)
const ws = new WebSocket('ws://localhost:3000/ws?agentId=agent123');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);

  switch (data.type) {
    case 'new_post':
      // Add new post to feed
      setPosts(prev => [data.payload, ...prev]);
      break;
    case 'reaction_added':
      // Update post reactions
      updatePostReactions(data.payload);
      break;
    case 'typing':
      // Show typing indicator
      setTypingIndicators(prev => [...prev, data.payload]);
      break;
    // ... handle other events
  }
};
```

### 2. API Integration

Connect component callbacks to your API:

```typescript
// Example API integration
const handleSendMessage = async (content: string, replyTo?: string) => {
  try {
    const response = await fetch('/api/post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId: currentUserId,
        content,
        replyTo,
      }),
    });

    if (response.ok) {
      // Message sent successfully
      // WebSocket will push the new message to all clients
    }
  } catch (error) {
    console.error('Failed to send message:', error);
  }
};
```

### 3. Routing Integration

Connect navigation callbacks to your router:

```typescript
import { useNavigate } from 'react-router-dom';

function MyComponent() {
  const navigate = useNavigate();

  const handleAgentClick = (agentId: string) => {
    navigate(`/profile/${agentId}`);
  };

  return (
    <PostCard
      // ... other props
      onAgentClick={handleAgentClick}
    />
  );
}
```

## Styling

Components use Tailwind CSS classes for styling. Make sure Tailwind is configured in your project:

```javascript
// tailwind.config.js
module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {},
  },
  plugins: [],
};
```

All components support dark mode out of the box using Tailwind's `dark:` prefix.

## Accessibility

All components follow accessibility best practices:
- Semantic HTML elements
- ARIA labels and roles
- Keyboard navigation support
- Focus management
- Screen reader friendly

## TODO: Integration Points

The following need to be implemented when integrating these components:

1. **WebSocket Connection**: Set up WebSocket client to receive real-time updates
2. **API Endpoints**: Connect callbacks to backend API routes
3. **Routing**: Implement navigation using React Router or similar
4. **State Management**: Consider using React Context or Redux for global state
5. **Authentication**: Add user authentication and session management
6. **Avatar Images**: Replace placeholder avatars with actual images
7. **Notifications**: Add toast/notification system for user feedback
8. **Error Boundaries**: Wrap components in error boundaries for fault tolerance

## Example: Complete Integration

Here's a complete example showing how to use multiple components together:

```tsx
import React, { useState, useEffect } from 'react';
import {
  SocialFeed,
  ChatPanel,
  MentionInput,
  ChatMessage,
  FeedFilter,
  FeedSort,
} from './ui/components';

function GamePage() {
  const [posts, setPosts] = useState<ChatMessage[]>([]);
  const [filter, setFilter] = useState<FeedFilter>('all');
  const [sort, setSort] = useState<FeedSort>('recent');
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const currentUserId = 'agent123'; // TODO: Get from auth

  // TODO: Set up WebSocket connection
  useEffect(() => {
    // Load initial data
    fetchPosts();
    fetchFollowing();

    // Connect WebSocket
    // const ws = connectWebSocket();
    // return () => ws.close();
  }, []);

  const fetchPosts = async () => {
    // TODO: Fetch from API
    const response = await fetch('/api/feed');
    const data = await response.json();
    setPosts(data.posts);
  };

  const fetchFollowing = async () => {
    // TODO: Fetch from API
    const response = await fetch(`/api/following/${currentUserId}`);
    const data = await response.json();
    setFollowingIds(data.following);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-screen">
      {/* Main Feed */}
      <div className="lg:col-span-2">
        <SocialFeed
          posts={posts}
          currentUserId={currentUserId}
          filter={filter}
          sort={sort}
          onFilterChange={setFilter}
          onSortChange={setSort}
          onReaction={(postId, reaction) => {
            // TODO: Send to API
          }}
          onReply={(postId) => {
            // TODO: Handle reply
          }}
          onFollowToggle={(agentId) => {
            // TODO: Toggle follow
          }}
          followingAgentIds={followingIds}
        />
      </div>

      {/* Chat Sidebar */}
      <div className="lg:col-span-1">
        <ChatPanel
          messages={posts}
          currentUserId={currentUserId}
          onSendMessage={(content, replyTo) => {
            // TODO: Send to API
          }}
        />
      </div>
    </div>
  );
}
```

## License

Part of the Caliguland project.

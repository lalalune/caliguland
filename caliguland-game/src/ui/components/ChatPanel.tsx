/**
 * ChatPanel Component
 *
 * Displays real-time chat messages with support for:
 * - Message threading (replies)
 * - @mentions (clickable)
 * - System messages
 * - Typing indicators
 * - Auto-scroll to bottom
 *
 * @component
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ChatPanelProps, ChatMessage } from '../types';

/**
 * Renders a single chat message with author info, timestamp, and content
 */
const MessageItem: React.FC<{
  message: ChatMessage;
  currentUserId: string;
  onMentionClick?: (agentId: string) => void;
  isReply?: boolean;
}> = ({ message, currentUserId, onMentionClick, isReply = false }) => {
  const isOwnMessage = message.authorId === currentUserId;
  const isSystem = message.isSystemMessage;

  // Parse content for @mentions and make them clickable
  const parseContentWithMentions = (content: string): React.ReactNode => {
    const mentionRegex = /@(\w+)/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(content)) !== null) {
      // Add text before mention
      if (match.index > lastIndex) {
        parts.push(content.substring(lastIndex, match.index));
      }

      // Add clickable mention
      const mentionName = match[1];
      parts.push(
        <button
          key={`mention-${match.index}`}
          onClick={() => onMentionClick?.(mentionName)}
          className="text-blue-500 dark:text-blue-400 hover:underline font-semibold cursor-pointer bg-transparent border-none"
          aria-label={`View profile of ${mentionName}`}
        >
          @{mentionName}
        </button>
      );

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < content.length) {
      parts.push(content.substring(lastIndex));
    }

    return parts.length > 0 ? parts : content;
  };

  // Format timestamp as relative time
  const formatTimestamp = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Get avatar (placeholder implementation)
  const getAvatar = (name: string): string => {
    // TODO: Replace with actual avatar URLs
    const colors = ['bg-purple-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-red-500'];
    const colorIndex = name.charCodeAt(0) % colors.length;
    return colors[colorIndex];
  };

  if (isSystem) {
    return (
      <div className="flex justify-center my-3">
        <div className="bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 px-4 py-2 rounded-full text-sm max-w-xl text-center">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex gap-3 mb-4 ${isReply ? 'ml-8 mt-2' : ''} ${
        isOwnMessage ? 'flex-row-reverse' : ''
      }`}
    >
      {/* Avatar */}
      <div
        className={`flex-shrink-0 w-10 h-10 rounded-full ${getAvatar(
          message.authorName
        )} flex items-center justify-center text-white font-bold cursor-pointer hover:opacity-80 transition-opacity`}
        onClick={() => onMentionClick?.(message.authorId)}
        role="button"
        tabIndex={0}
        aria-label={`View ${message.authorName}'s profile`}
      >
        {message.authorName.charAt(0).toUpperCase()}
      </div>

      {/* Message Content */}
      <div className={`flex-1 min-w-0 ${isOwnMessage ? 'text-right' : ''}`}>
        <div className="flex items-baseline gap-2 mb-1">
          <button
            onClick={() => onMentionClick?.(message.authorId)}
            className={`font-semibold text-gray-900 dark:text-gray-100 hover:underline cursor-pointer bg-transparent border-none ${
              isOwnMessage ? 'order-2' : 'order-1'
            }`}
          >
            {message.authorName}
          </button>
          <span
            className={`text-xs text-gray-500 dark:text-gray-400 ${
              isOwnMessage ? 'order-1' : 'order-2'
            }`}
          >
            {formatTimestamp(message.timestamp)}
          </span>
        </div>

        <div
          className={`${
            isOwnMessage
              ? 'bg-blue-500 text-white rounded-l-2xl rounded-tr-2xl'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-r-2xl rounded-tl-2xl'
          } px-4 py-2 inline-block max-w-xl break-words`}
        >
          <p className="text-sm">{parseContentWithMentions(message.content)}</p>
        </div>

        {/* Reactions */}
        {(message.likeCount || message.dislikeCount) && (
          <div className="flex gap-2 mt-1 text-xs text-gray-600 dark:text-gray-400">
            {message.likeCount > 0 && <span>👍 {message.likeCount}</span>}
            {message.dislikeCount > 0 && <span>👎 {message.dislikeCount}</span>}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Typing indicator component
 */
const TypingIndicator: React.FC<{ names: string[] }> = ({ names }) => {
  if (names.length === 0) return null;

  const text =
    names.length === 1
      ? `${names[0]} is typing...`
      : names.length === 2
      ? `${names[0]} and ${names[1]} are typing...`
      : `${names[0]} and ${names.length - 1} others are typing...`;

  return (
    <div className="flex items-center gap-2 px-4 py-2 text-sm text-gray-500 dark:text-gray-400 italic">
      <div className="flex gap-1">
        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span>{text}</span>
    </div>
  );
};

/**
 * Main ChatPanel component
 */
export const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  currentUserId,
  onSendMessage,
  onMentionClick,
  typingIndicators = [],
  isLoading = false,
  error,
  maxHeight = '600px',
}) => {
  const [inputValue, setInputValue] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | undefined>();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, autoScroll]);

  // Detect if user has scrolled up (disable auto-scroll)
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;

    setAutoScroll(isNearBottom);
  }, []);

  // Handle message submission
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      const trimmed = inputValue.trim();
      if (!trimmed) return;

      onSendMessage(trimmed, replyingTo);
      setInputValue('');
      setReplyingTo(undefined);
    },
    [inputValue, replyingTo, onSendMessage]
  );

  // Handle Enter key (submit) and Shift+Enter (new line)
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit(e);
      }
    },
    [handleSubmit]
  );

  // Group messages with their replies
  const groupedMessages = messages.reduce<ChatMessage[]>((acc, msg) => {
    if (!msg.replyTo) {
      acc.push(msg);
    }
    return acc;
  }, []);

  const getReplies = (messageId: string): ChatMessage[] => {
    return messages.filter((m) => m.replyTo === messageId);
  };

  // Get typing indicator names
  const typingNames = typingIndicators
    .filter((t) => t.agentId !== currentUserId)
    .map((t) => t.agentName);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 rounded-lg shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Chat</h2>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {messages.length} message{messages.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Messages Container */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-2"
        style={{ maxHeight }}
      >
        {error && (
          <div className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {isLoading && messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500 dark:text-gray-400">Loading messages...</div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500 dark:text-gray-400 text-center">
              <p className="text-lg mb-2">No messages yet</p>
              <p className="text-sm">Be the first to say something!</p>
            </div>
          </div>
        ) : (
          <>
            {groupedMessages.map((message) => (
              <div key={message.id}>
                <MessageItem
                  message={message}
                  currentUserId={currentUserId}
                  onMentionClick={onMentionClick}
                />
                {getReplies(message.id).map((reply) => (
                  <MessageItem
                    key={reply.id}
                    message={reply}
                    currentUserId={currentUserId}
                    onMentionClick={onMentionClick}
                    isReply
                  />
                ))}
              </div>
            ))}
          </>
        )}

        {/* Typing Indicator */}
        <TypingIndicator names={typingNames} />

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-4">
        {replyingTo && (
          <div className="flex items-center gap-2 mb-2 text-sm text-gray-600 dark:text-gray-400">
            <span>Replying to message...</span>
            <button
              onClick={() => setReplyingTo(undefined)}
              className="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300"
              aria-label="Cancel reply"
            >
              Cancel
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex gap-2">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message... (@ to mention)"
            rows={1}
            className="flex-1 resize-none rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-shadow"
            maxLength={280}
            disabled={isLoading}
            aria-label="Message input"
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className="px-6 py-2 bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Send message"
          >
            Send
          </button>
        </form>

        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-right">
          {inputValue.length}/280
        </div>
      </div>

      {/* Scroll to bottom button */}
      {!autoScroll && (
        <button
          onClick={() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            setAutoScroll(true);
          }}
          className="absolute bottom-24 right-8 bg-blue-500 hover:bg-blue-600 text-white rounded-full p-3 shadow-lg transition-colors"
          aria-label="Scroll to bottom"
        >
          ↓
        </button>
      )}
    </div>
  );
};

export default ChatPanel;

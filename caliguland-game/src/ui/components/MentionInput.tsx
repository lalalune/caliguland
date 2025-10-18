/**
 * MentionInput Component
 *
 * Text input with @mention autocomplete:
 * - Dropdown of matching agents as user types "@"
 * - Insert mention on selection
 * - Highlight mentions in input
 * - Character limit (280 characters)
 * - Submit button with validation
 *
 * @component
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { MentionInputProps, MentionSuggestion } from '../types';

/**
 * Mention suggestion item component
 */
const SuggestionItem: React.FC<{
  suggestion: MentionSuggestion;
  isSelected: boolean;
  onClick: () => void;
}> = ({ suggestion, isSelected, onClick }) => {
  const getAvatarColor = (name: string): string => {
    const colors = [
      'bg-purple-500',
      'bg-blue-500',
      'bg-green-500',
      'bg-yellow-500',
      'bg-red-500',
    ];
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${
        isSelected
          ? 'bg-blue-100 dark:bg-blue-900'
          : 'hover:bg-gray-100 dark:hover:bg-gray-800'
      }`}
      type="button"
    >
      <div
        className={`w-8 h-8 rounded-full ${getAvatarColor(
          suggestion.name
        )} flex items-center justify-center text-white text-sm font-bold`}
      >
        {suggestion.name.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-gray-900 dark:text-gray-100 truncate">
          {suggestion.name}
        </div>
        {suggestion.reputation !== undefined && (
          <div className="text-xs text-gray-600 dark:text-gray-400">
            Reputation: {suggestion.reputation}
          </div>
        )}
      </div>
    </button>
  );
};

/**
 * Main MentionInput component
 */
export const MentionInput: React.FC<MentionInputProps> = ({
  value,
  onChange,
  onSubmit,
  onMentionSearch,
  placeholder = 'What\'s on your mind? (@ to mention)',
  maxLength = 280,
  disabled = false,
  isSubmitting = false,
  autoFocus = false,
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [suggestions, setSuggestions] = useState<MentionSuggestion[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  /**
   * Detect @mention pattern and current word being typed
   */
  const getCurrentMention = useCallback((): { query: string; start: number } | null => {
    const textBeforeCursor = value.substring(0, cursorPosition);
    const match = textBeforeCursor.match(/@(\w*)$/);

    if (match) {
      return {
        query: match[1],
        start: match.index!,
      };
    }

    return null;
  }, [value, cursorPosition]);

  /**
   * Update suggestions when user types @mention
   */
  useEffect(() => {
    const mention = getCurrentMention();

    if (mention && onMentionSearch) {
      const results = onMentionSearch(mention.query);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
      setSelectedIndex(0);
    } else {
      setShowSuggestions(false);
      setSuggestions([]);
    }
  }, [getCurrentMention, onMentionSearch]);

  /**
   * Handle cursor position changes
   */
  const handleSelectionChange = useCallback(() => {
    if (textareaRef.current) {
      setCursorPosition(textareaRef.current.selectionStart);
    }
  }, []);

  /**
   * Insert selected mention
   */
  const insertMention = useCallback(
    (suggestion: MentionSuggestion) => {
      const mention = getCurrentMention();
      if (!mention) return;

      const before = value.substring(0, mention.start);
      const after = value.substring(cursorPosition);
      const newValue = `${before}@${suggestion.name} ${after}`;

      onChange(newValue);
      setShowSuggestions(false);

      // Move cursor after inserted mention
      const newCursorPos = mention.start + suggestion.name.length + 2; // +2 for @ and space
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        }
      }, 0);
    },
    [getCurrentMention, value, cursorPosition, onChange]
  );

  /**
   * Handle keyboard navigation in suggestions
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (!showSuggestions) {
        // Submit on Enter without Shift
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          if (value.trim() && !disabled && !isSubmitting) {
            onSubmit();
          }
        }
        return;
      }

      // Navigate suggestions
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (suggestions[selectedIndex]) {
            insertMention(suggestions[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setShowSuggestions(false);
          break;
      }
    },
    [
      showSuggestions,
      suggestions,
      selectedIndex,
      insertMention,
      value,
      disabled,
      isSubmitting,
      onSubmit,
    ]
  );

  /**
   * Auto-resize textarea based on content
   */
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);

  /**
   * Close dropdown when clicking outside
   */
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        textareaRef.current &&
        !textareaRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /**
   * Check if submit should be disabled
   */
  const isSubmitDisabled = useMemo(() => {
    return disabled || isSubmitting || !value.trim() || value.length > maxLength;
  }, [disabled, isSubmitting, value, maxLength]);

  /**
   * Get character count color
   */
  const getCharCountColor = (): string => {
    const remaining = maxLength - value.length;
    if (remaining < 0) return 'text-red-600 dark:text-red-400';
    if (remaining < 20) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-gray-500 dark:text-gray-400';
  };

  return (
    <div className="relative w-full">
      {/* Main input area */}
      <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 dark:focus-within:ring-blue-400 focus-within:border-transparent transition-shadow">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onSelect={handleSelectionChange}
          onClick={handleSelectionChange}
          placeholder={placeholder}
          disabled={disabled || isSubmitting}
          autoFocus={autoFocus}
          rows={1}
          className="w-full px-4 py-3 bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 resize-none focus:outline-none"
          style={{ minHeight: '56px', maxHeight: '200px' }}
          aria-label="Message input"
        />

        {/* Footer with character count and submit button */}
        <div className="flex items-center justify-between px-4 pb-3">
          <div className={`text-xs font-medium ${getCharCountColor()}`}>
            {value.length}/{maxLength}
            {value.length > maxLength && (
              <span className="ml-2">({value.length - maxLength} over limit)</span>
            )}
          </div>

          <button
            onClick={onSubmit}
            disabled={isSubmitDisabled}
            className={`px-6 py-2 rounded-full font-semibold transition-all ${
              isSubmitDisabled
                ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                : 'bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-700 text-white shadow-sm hover:shadow-md'
            }`}
            aria-label="Submit"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Posting...
              </span>
            ) : (
              'Post'
            )}
          </button>
        </div>
      </div>

      {/* Mention suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto z-50"
          role="listbox"
          aria-label="Mention suggestions"
        >
          <div className="py-2">
            {suggestions.map((suggestion, index) => (
              <SuggestionItem
                key={suggestion.id}
                suggestion={suggestion}
                isSelected={index === selectedIndex}
                onClick={() => insertMention(suggestion)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Helper text */}
      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        Type @ to mention someone • Enter to post • Shift+Enter for new line
      </div>
    </div>
  );
};

export default MentionInput;

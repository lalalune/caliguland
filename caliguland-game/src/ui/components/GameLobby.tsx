/**
 * GameLobby Component
 *
 * Pre-game lobby where players wait for a game to start.
 * Shows players in lobby, countdown to auto-start, scenario preview,
 * and chat functionality.
 *
 * Features:
 * - List of players in lobby (waiting to start)
 * - Player count (X/20)
 * - Minimum players indicator (need 5 to start)
 * - Countdown to auto-start (if enough players)
 * - Start game button (for host/admin)
 * - Scenario preview
 * - Chat while waiting
 * - Leave lobby button
 *
 * @module ui/components/GameLobby
 */

import React, { useState, useEffect, useRef } from 'react';

/**
 * Player in lobby
 */
export interface LobbyPlayer {
  agentId: string;
  agentName: string;
  avatar?: string;
  isReady: boolean;
  reputationScore?: number;
}

/**
 * Chat message in lobby
 */
export interface LobbyChatMessage {
  id: string;
  agentId: string;
  agentName: string;
  content: string;
  timestamp: Date;
}

/**
 * Scenario preview data
 */
export interface ScenarioPreview {
  title: string;
  description: string;
  question: string;
  estimatedDuration: string;
}

/**
 * Props for GameLobby component
 */
export interface GameLobbyProps {
  /** Players currently in lobby */
  players: LobbyPlayer[];
  /** Current player's agent ID */
  currentAgentId: string;
  /** Minimum players needed to start */
  minPlayers: number;
  /** Maximum players allowed */
  maxPlayers: number;
  /** Whether current player is host/admin */
  isHost: boolean;
  /** Auto-start countdown in seconds (null if not enough players) */
  autoStartCountdown: number | null;
  /** Scenario preview (optional) */
  scenarioPreview?: ScenarioPreview;
  /** Chat messages */
  chatMessages: LobbyChatMessage[];
  /** Callback to send chat message */
  onSendMessage: (message: string) => void;
  /** Callback to start game (host only) */
  onStartGame: () => void;
  /** Callback to leave lobby */
  onLeaveLobby: () => void;
  /** Loading state */
  isLoading?: boolean;
}

/**
 * GameLobby Component
 *
 * Waiting room for players before game starts.
 * Displays player list, chat, and scenario information.
 *
 * @param props - GameLobby component props
 * @returns Rendered game lobby
 */
export const GameLobby: React.FC<GameLobbyProps> = ({
  players,
  currentAgentId,
  minPlayers,
  maxPlayers,
  isHost,
  autoStartCountdown,
  scenarioPreview,
  chatMessages,
  onSendMessage,
  onStartGame,
  onLeaveLobby,
  isLoading = false,
}) => {
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  /**
   * Auto-scroll chat to bottom when new messages arrive
   */
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  /**
   * Handle send message
   */
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatInput.trim()) {
      onSendMessage(chatInput.trim());
      setChatInput('');
    }
  };

  /**
   * Calculate if game can start
   */
  const canStart = players.length >= minPlayers;

  /**
   * Get avatar or placeholder
   */
  const getAvatar = (player: LobbyPlayer) => {
    if (player.avatar) {
      return (
        <img
          src={player.avatar}
          alt={player.agentName}
          className="w-full h-full object-cover"
        />
      );
    }
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-600 to-purple-600 text-white font-bold">
        {player.agentName.charAt(0).toUpperCase()}
      </div>
    );
  };

  /**
   * Format countdown time
   */
  const formatCountdown = (seconds: number): string => {
    return `${seconds}s`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-pulse text-gray-400">Loading lobby...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Players and Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-white">Game Lobby</h2>
              <button
                onClick={onLeaveLobby}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
              >
                Leave
              </button>
            </div>

            {/* Player Count */}
            <div className="flex items-center gap-4">
              <div className="flex-1 bg-gray-900 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Players</span>
                  <span className="text-2xl font-bold text-white">
                    {players.length}/{maxPlayers}
                  </span>
                </div>
                {/* Progress Bar */}
                <div className="mt-2 w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 to-purple-600 transition-all"
                    style={{
                      width: `${(players.length / maxPlayers) * 100}%`,
                    }}
                  ></div>
                </div>
              </div>

              {/* Minimum Players Indicator */}
              <div
                className={`px-4 py-2 rounded-lg border ${
                  canStart
                    ? 'bg-green-900/30 border-green-700'
                    : 'bg-yellow-900/30 border-yellow-700'
                }`}
              >
                <div className="text-xs text-gray-400 mb-1">Min Players</div>
                <div
                  className={`text-lg font-bold ${
                    canStart ? 'text-green-400' : 'text-yellow-400'
                  }`}
                >
                  {minPlayers}
                  {canStart ? (
                    <svg
                      className="inline-block w-5 h-5 ml-1"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Auto-start Countdown */}
            {autoStartCountdown !== null && canStart && (
              <div className="mt-4 bg-blue-900/30 border border-blue-700 rounded-lg p-4 text-center">
                <div className="text-blue-400 font-semibold mb-1">
                  Game Starting In
                </div>
                <div className="text-3xl font-bold text-white font-mono">
                  {formatCountdown(autoStartCountdown)}
                </div>
              </div>
            )}

            {/* Start Game Button (Host) */}
            {isHost && (
              <button
                onClick={onStartGame}
                disabled={!canStart}
                className={`mt-4 w-full py-3 rounded-lg font-bold text-lg transition-all ${
                  canStart
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                }`}
              >
                {canStart ? 'Start Game Now' : `Waiting for ${minPlayers - players.length} more player(s)`}
              </button>
            )}

            {/* Waiting Message (Non-host) */}
            {!isHost && !canStart && (
              <div className="mt-4 text-center text-gray-400 text-sm">
                Waiting for {minPlayers - players.length} more player(s) to join...
              </div>
            )}
          </div>

          {/* Players List */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <h3 className="text-lg font-bold text-white mb-4">Players in Lobby</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {players.map((player) => {
                const isCurrentPlayer = player.agentId === currentAgentId;
                return (
                  <div
                    key={player.agentId}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      isCurrentPlayer
                        ? 'bg-blue-900/30 border border-blue-700'
                        : 'bg-gray-900'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                        {getAvatar(player)}
                      </div>

                      {/* Name and Info */}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-white font-semibold">
                            {player.agentName}
                          </span>
                          {isCurrentPlayer && (
                            <span className="text-xs text-blue-400">(You)</span>
                          )}
                          {isHost && player.agentId === players[0]?.agentId && (
                            <span className="text-xs text-yellow-400">Host</span>
                          )}
                        </div>
                        {player.reputationScore !== undefined && (
                          <div className="text-xs text-gray-500">
                            Rep: {player.reputationScore.toFixed(1)}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Ready Status */}
                    {player.isReady && (
                      <div className="flex items-center gap-1 text-green-400 text-sm">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span>Ready</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Scenario Preview */}
          {scenarioPreview && (
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <h3 className="text-lg font-bold text-white mb-4">Next Scenario</h3>
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-gray-400 mb-1">Title</div>
                  <div className="text-white font-semibold">{scenarioPreview.title}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-400 mb-1">Description</div>
                  <div className="text-gray-300 text-sm">{scenarioPreview.description}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-400 mb-1">Question</div>
                  <div className="text-white font-medium">{scenarioPreview.question}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-400 mb-1">Duration</div>
                  <div className="text-gray-300 text-sm">{scenarioPreview.estimatedDuration}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Chat */}
        <div className="lg:col-span-1">
          <div className="bg-gray-800 rounded-lg border border-gray-700 flex flex-col h-[600px]">
            {/* Chat Header */}
            <div className="px-4 py-3 border-b border-gray-700">
              <h3 className="text-lg font-bold text-white">Lobby Chat</h3>
            </div>

            {/* Chat Messages */}
            <div
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto p-4 space-y-3"
            >
              {chatMessages.length === 0 ? (
                <div className="text-center text-gray-500 text-sm mt-8">
                  No messages yet. Say hello!
                </div>
              ) : (
                chatMessages.map((message) => {
                  const isOwnMessage = message.agentId === currentAgentId;
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-3 ${
                          isOwnMessage
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-700 text-gray-100'
                        }`}
                      >
                        {!isOwnMessage && (
                          <div className="text-xs font-semibold mb-1 opacity-80">
                            {message.agentName}
                          </div>
                        )}
                        <div className="text-sm break-words">{message.content}</div>
                        <div className="text-xs opacity-60 mt-1">
                          {message.timestamp.toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-700">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  maxLength={200}
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                  </svg>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameLobby;

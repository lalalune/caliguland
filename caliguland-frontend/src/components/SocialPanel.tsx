import { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { api } from '../services/api';
import type { Post, DirectMessage, Player } from '../types/game';

type Tab = 'feed' | 'dms';
type ChatView = 'list' | 'conversation';

export function SocialPanel() {
  const { gameState, playerId, directMessages } = useGameStore();
  const [activeTab, setActiveTab] = useState<Tab>('feed');
  const [chatView, setChatView] = useState<ChatView>('list');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [newPost, setNewPost] = useState('');
  const [newDM, setNewDM] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [isSendingDM, setIsSendingDM] = useState(false);
  const feedEndRef = useRef<HTMLDivElement>(null);
  const dmEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [gameState?.feed]);

  useEffect(() => {
    dmEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [directMessages]);

  useEffect(() => {
    if (!playerId) return;

    const pollDMs = async () => {
      try {
        const dms = await api.getDMs(playerId);
        dms.forEach(dm => {
          if (!directMessages.find(existing => existing.id === dm.id)) {
            useGameStore.getState().addDirectMessage(dm);
          }
        });
      } catch {
        // Silently fail polling - will retry on next interval
      }
    };

    const interval = setInterval(pollDMs, 2000);
    return () => clearInterval(interval);
  }, [playerId, directMessages]);

  const handlePost = async () => {
    if (!newPost.trim() || !playerId) return;

    setIsPosting(true);
    try {
      await api.postMessage({
        agentId: playerId,
        content: newPost.trim()
      });
      setNewPost('');
    } finally {
      setIsPosting(false);
    }
  };

  const handleSendDM = async () => {
    if (!newDM.trim() || !playerId || !selectedPlayer) return;

    setIsSendingDM(true);
    try {
      await api.sendDM({
        from: playerId,
        to: selectedPlayer.id,
        content: newDM.trim()
      });
      setNewDM('');
    } finally {
      setIsSendingDM(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getPlayerById = (id: string): Player | undefined => {
    return gameState?.players?.find(p => p.id === id);
  };

  const getConversationWith = (playerId: string): DirectMessage[] => {
    return directMessages.filter(
      dm => (dm.from === playerId || dm.to === playerId) && 
            (dm.from === selectedPlayer?.id || dm.to === selectedPlayer?.id)
    ).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  };

  const getUniqueDMPlayers = (): Player[] => {
    const playerIds = new Set<string>();
    directMessages.forEach(dm => {
      if (dm.from === playerId) playerIds.add(dm.to);
      if (dm.to === playerId) playerIds.add(dm.from);
    });
    return Array.from(playerIds)
      .map(id => getPlayerById(id))
      .filter((p): p is Player => p !== undefined);
  };

  const getLastMessage = (otherPlayerId: string): DirectMessage | undefined => {
    const conversation = directMessages.filter(
      dm => (dm.from === playerId && dm.to === otherPlayerId) || 
            (dm.from === otherPlayerId && dm.to === playerId)
    );
    return conversation[conversation.length - 1];
  };

  const getUnreadCount = (otherPlayerId: string): number => {
    return directMessages.filter(
      dm => dm.from === otherPlayerId && dm.to === playerId
    ).length;
  };

  return (
    <div className="card h-full flex flex-col">
      {/* Tab Navigation */}
      <div className="flex gap-2 mb-4 border-b border-gray-700 pb-4">
        <button
          onClick={() => {
            setActiveTab('feed');
            setChatView('list');
          }}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'feed'
              ? 'bg-primary text-white'
              : 'bg-gray-700 hover:bg-gray-600'
          }`}
        >
          Public Feed
        </button>
        <button
          onClick={() => {
            setActiveTab('dms');
            setChatView('list');
          }}
          className={`px-4 py-2 rounded-lg font-medium transition-colors relative ${
            activeTab === 'dms'
              ? 'bg-primary text-white'
              : 'bg-gray-700 hover:bg-gray-600'
          }`}
        >
          Direct Messages
          {directMessages.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {directMessages.length}
            </span>
          )}
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === 'feed' ? (
          <>
            {/* Feed Messages */}
            <div className="flex-1 overflow-y-auto space-y-3 mb-4" data-cy="feed-messages">
              {gameState?.feed?.map((post: Post) => (
                <div 
                  key={post.id}
                  className={`p-3 rounded-lg ${
                    post.isSystemMessage 
                      ? 'bg-blue-500/20 border border-blue-500/50' 
                      : 'bg-gray-700'
                  }`}
                  data-cy={`feed-post-${post.id}`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <span className="font-medium text-sm">{post.authorName}</span>
                    <span className="text-xs text-gray-400">
                      Day {post.gameDay} • {formatTimestamp(post.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-200">{post.content}</p>
                </div>
              ))}
              <div ref={feedEndRef} />
            </div>

            {/* Post Input */}
            {playerId && gameState && (
              <div className="space-y-2 border-t border-gray-700 pt-4">
                <textarea
                  value={newPost}
                  onChange={(e) => setNewPost(e.target.value)}
                  placeholder="Share your thoughts... (max 280 chars)"
                  maxLength={280}
                  rows={3}
                  className="input resize-none"
                  data-cy="post-input"
                  disabled={isPosting}
                />
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">
                    {newPost.length} / 280
                  </span>
                  <button
                    onClick={handlePost}
                    disabled={isPosting || !newPost.trim()}
                    className="btn btn-primary"
                    data-cy="post-button"
                  >
                    {isPosting ? 'Posting...' : 'Post'}
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            {/* DM Interface */}
            {chatView === 'list' ? (
              <div className="flex-1 overflow-y-auto">
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-400 mb-2">Start a conversation</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {gameState?.players?.filter(p => p.id !== playerId).map((player) => {
                      const lastMsg = getLastMessage(player.id);
                      const unread = getUnreadCount(player.id);
                      
                      return (
                        <button
                          key={player.id}
                          onClick={() => {
                            setSelectedPlayer(player);
                            setChatView('conversation');
                          }}
                          className="p-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-left transition-colors relative"
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${
                              player.type === 'ai' ? 'bg-blue-400' : 'bg-green-400'
                            }`} />
                            <span className="font-medium text-sm">{player.name}</span>
                            {unread > 0 && (
                              <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                                {unread}
                              </span>
                            )}
                          </div>
                          {lastMsg && (
                            <p className="text-xs text-gray-400 mt-1 truncate">
                              {lastMsg.from === playerId ? 'You: ' : ''}{lastMsg.content}
                            </p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Conversation View */}
                <div className="mb-3 pb-3 border-b border-gray-700 flex items-center gap-3">
                  <button
                    onClick={() => {
                      setChatView('list');
                      setSelectedPlayer(null);
                    }}
                    className="text-gray-400 hover:text-white"
                  >
                    ← Back
                  </button>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      selectedPlayer?.type === 'ai' ? 'bg-blue-400' : 'bg-green-400'
                    }`} />
                    <span className="font-medium">{selectedPlayer?.name}</span>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto space-y-2 mb-4">
                  {playerId && selectedPlayer && getConversationWith(playerId).map((dm) => (
                    <div
                      key={dm.id}
                      className={`p-3 rounded-lg max-w-[80%] ${
                        dm.from === playerId
                          ? 'ml-auto bg-primary text-white'
                          : 'bg-gray-700'
                      }`}
                    >
                      <p className="text-sm">{dm.content}</p>
                      <span className="text-xs opacity-70 mt-1 block">
                        {formatTimestamp(dm.timestamp)}
                      </span>
                    </div>
                  ))}
                  <div ref={dmEndRef} />
                </div>

                {/* DM Input */}
                <div className="space-y-2 border-t border-gray-700 pt-4">
                  <textarea
                    value={newDM}
                    onChange={(e) => setNewDM(e.target.value)}
                    placeholder="Type a message..."
                    maxLength={280}
                    rows={3}
                    className="input resize-none"
                    disabled={isSendingDM}
                  />
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-400">
                      {newDM.length} / 280
                    </span>
                    <button
                      onClick={handleSendDM}
                      disabled={isSendingDM || !newDM.trim()}
                      className="btn btn-primary"
                    >
                      {isSendingDM ? 'Sending...' : 'Send'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}


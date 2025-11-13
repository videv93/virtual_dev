import { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../stores/gameStore';
import { supabaseService } from '../services/supabase.service';
import { PROXIMITY_RADIUS } from '@virtual-dev/shared';

export function ChatPanel() {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentUser = useGameStore((state) => state.currentUser);
  const chatMessages = useGameStore((state) => state.chatMessages);
  const nearbyUsers = useGameStore((state) => state.nearbyUsers);
  const users = useGameStore((state) => state.users);
  const isChatPanelOpen = useGameStore((state) => state.isChatPanelOpen);
  const toggleChatPanel = useGameStore((state) => state.toggleChatPanel);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!message.trim() || !currentUser || isSending) return;

    setIsSending(true);

    try {
      await supabaseService.sendMessage(
        currentUser.id,
        currentUser.username,
        message.trim(),
        currentUser.position
      );

      setMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

  // Filter messages to only show those within proximity radius
  const visibleMessages = chatMessages.filter((msg) => {
    // Show own messages
    if (msg.userId === currentUser?.id) return true;

    // Show messages from nearby users
    if (nearbyUsers.has(msg.userId)) return true;

    // Optionally: show messages that were sent from nearby positions
    // (even if user has moved away)
    if (currentUser && msg.position) {
      const dx = msg.position.x - currentUser.position.x;
      const dy = msg.position.y - currentUser.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance <= PROXIMITY_RADIUS;
    }

    return false;
  });

  // Get list of nearby usernames
  const nearbyUserList = Array.from(nearbyUsers)
    .map((userId) => users.get(userId))
    .filter((user) => user !== undefined);

  if (!supabaseService.isInitialized()) {
    return null; // Don't render if Supabase is not configured
  }

  return (
    <div
      className={`fixed top-0 right-0 h-screen bg-gray-900 border-l border-gray-700 shadow-2xl transition-transform duration-300 z-10 w-full md:w-[350px] ${
        isChatPanelOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      {/* Header */}
      <div className="bg-gray-800 p-4 border-b border-gray-700 flex items-center justify-between">
        <div>
          <h2 className="text-white font-bold text-lg">Proximity Chat</h2>
          <p className="text-gray-400 text-xs">
            {nearbyUserList.length} nearby • {PROXIMITY_RADIUS}px radius
          </p>
        </div>
        <button
          onClick={toggleChatPanel}
          className="text-gray-400 hover:text-white transition-colors"
          aria-label="Close chat panel"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Nearby Users List */}
      {nearbyUserList.length > 0 && (
        <div className="bg-gray-800 p-3 border-b border-gray-700">
          <p className="text-gray-400 text-xs font-semibold mb-2">NEARBY USERS</p>
          <div className="flex flex-wrap gap-2">
            {nearbyUserList.map((user) => (
              <div
                key={user.id}
                className="flex items-center gap-1 bg-gray-700 rounded-full px-2 py-1"
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: user.color }}
                />
                <span className="text-xs text-white">{user.username}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ height: 'calc(100vh - 220px)' }}>
        {visibleMessages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <p className="text-sm">No messages yet</p>
            <p className="text-xs mt-2">
              {nearbyUserList.length === 0
                ? 'Get close to other users to chat'
                : 'Start a conversation!'}
            </p>
          </div>
        ) : (
          visibleMessages.map((msg) => {
            const isOwnMessage = msg.userId === currentUser?.id;
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 ${
                    isOwnMessage
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-white'
                  }`}
                >
                  {!isOwnMessage && (
                    <p className="text-xs font-semibold mb-1 opacity-75">
                      {msg.username}
                    </p>
                  )}
                  <p className="text-sm break-words">{msg.message}</p>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </p>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <form onSubmit={handleSendMessage} className="p-4 bg-gray-800 border-t border-gray-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              // Prevent Phaser from capturing keyboard events when typing
              e.stopPropagation();
            }}
            placeholder={
              nearbyUserList.length === 0
                ? 'Get close to someone to chat...'
                : 'Type a message...'
            }
            disabled={isSending || nearbyUserList.length === 0}
            className="flex-1 bg-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            maxLength={500}
          />
          <button
            type="submit"
            disabled={!message.trim() || isSending || nearbyUserList.length === 0}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600"
          >
            {isSending ? 'Sending...' : 'Send'}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          {nearbyUserList.length === 0
            ? `Move within ${PROXIMITY_RADIUS}px of another user to chat`
            : 'Messages visible to nearby users only'}
        </p>
      </form>

      {/* Toggle Button (visible when panel is closed) */}
      {!isChatPanelOpen && (
        <button
          onClick={toggleChatPanel}
          className="fixed right-4 bottom-20 md:absolute md:-left-12 md:top-4 md:right-auto md:bottom-auto bg-blue-600 hover:bg-blue-700 text-white rounded-lg md:rounded-l-lg p-3 shadow-lg transition-colors"
          aria-label="Open chat panel"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          {nearbyUserList.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
              {nearbyUserList.length}
            </span>
          )}
        </button>
      )}
    </div>
  );
}

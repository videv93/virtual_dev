import { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../stores/gameStore';
import { NPCConfig } from '@virtual-dev/shared';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export const NPCChatModal: React.FC = () => {
  const activeNPC = useGameStore((state) => state.activeNPC);
  const setActiveNPC = useGameStore((state) => state.setActiveNPC);
  const currentUser = useGameStore((state) => state.currentUser);
  const npcConversationId = useGameStore((state) => state.npcConversationId);
  const setNPCConversationId = useGameStore((state) => state.setNPCConversationId);

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when modal opens
  useEffect(() => {
    if (activeNPC) {
      inputRef.current?.focus();
    }
  }, [activeNPC]);

  // Reset state when NPC changes
  useEffect(() => {
    if (activeNPC) {
      setMessages([]);
      setError(null);
      setNPCConversationId(null);
    }
  }, [activeNPC?.id]);

  const handleClose = () => {
    setActiveNPC(null);
    setMessages([]);
    setError(null);
    setNPCConversationId(null);
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !activeNPC || !currentUser || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setError(null);

    // Add user message to UI
    const newUserMessage: Message = {
      role: 'user',
      content: userMessage,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, newUserMessage]);

    setIsLoading(true);

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
      const response = await fetch(`${backendUrl}/api/npc/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          npcId: activeNPC.id,
          userId: currentUser.id,
          message: userMessage,
          conversationId: npcConversationId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Add assistant message to UI
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.message,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, assistantMessage]);

        // Update conversation ID
        if (data.conversationId) {
          setNPCConversationId(data.conversationId);
        }
      } else {
        setError(data.error || 'Failed to send message');
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to connect to server');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Stop propagation to prevent Phaser from capturing WASD keys
    e.stopPropagation();
  };

  const handleKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Stop propagation to prevent Phaser from capturing WASD keys
    e.stopPropagation();
  };

  if (!activeNPC) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col border-2 border-cyan-500">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-cyan-500 rounded-lg flex items-center justify-center">
              <span className="text-2xl">🤖</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{activeNPC.name}</h2>
              <p className="text-sm text-cyan-400">{activeNPC.role}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Close"
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

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-gray-400 py-8">
              <p className="text-lg mb-2">👋 Hi! I'm {activeNPC.name}</p>
              <p className="text-sm">{activeNPC.role}</p>
              <p className="text-sm mt-4">Ask me anything!</p>
            </div>
          )}

          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  msg.role === 'user'
                    ? 'bg-cyan-600 text-white'
                    : 'bg-gray-800 text-gray-100'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                <p className="text-xs opacity-70 mt-1">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-800 rounded-lg p-3">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce"></div>
                  <div
                    className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce"
                    style={{ animationDelay: '0.2s' }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce"
                    style={{ animationDelay: '0.4s' }}
                  ></div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-900 border border-red-700 text-red-100 rounded-lg p-3 text-sm">
              ⚠️ {error}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-700">
          <div className="flex space-x-2">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              onKeyDown={handleKeyDown}
              onKeyUp={handleKeyUp}
              placeholder="Type your message..."
              disabled={isLoading}
              className="flex-1 bg-gray-800 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50"
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading}
              className="bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-semibold transition-colors"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

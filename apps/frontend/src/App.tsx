import { useEffect } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { ConnectionStatus } from './components/ConnectionStatus';
import { ChatPanel } from './components/ChatPanel';
import { EncounterPopup } from './components/EncounterPopup';
import { socketService } from './services/socket.service';
import { supabaseService } from './services/supabase.service';
import { useGameStore } from './stores/gameStore';

function App() {
  useEffect(() => {
    // Initialize Supabase
    supabaseService.initialize();

    // Connect to WebSocket server
    socketService.connect();

    // Join the game
    socketService.join();

    // Load chat history if Supabase is initialized
    if (supabaseService.isInitialized()) {
      supabaseService.loadRecentMessages(50).then((messages) => {
        useGameStore.getState().setChatMessages(messages);
      });

      // Subscribe to real-time chat messages
      supabaseService.subscribeToMessages((message) => {
        useGameStore.getState().addChatMessage(message);
      });
    }

    // Cleanup on unmount
    return () => {
      socketService.disconnect();
      supabaseService.unsubscribeFromMessages();
    };
  }, []);

  return (
    <div className="w-full h-full bg-gray-900 relative">
      <GameCanvas />
      <ConnectionStatus />
      <ChatPanel />
      <EncounterPopup />

      {/* Instructions */}
      <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-sm rounded-lg px-4 py-3 text-white max-w-md">
        <h3 className="font-bold mb-2">Controls:</h3>
        <ul className="text-sm space-y-1">
          <li>• Move: WASD or Arrow Keys</li>
          <li>• Get close to other users to chat (150px radius)</li>
          <li>• Click the chat button on the right to open chat panel</li>
          <li>• Your username appears above your dot</li>
        </ul>
      </div>
    </div>
  );
}

export default App;

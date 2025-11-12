import { useEffect } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { ConnectionStatus } from './components/ConnectionStatus';
import { ChatPanel } from './components/ChatPanel';
import { EncounterPopup } from './components/EncounterPopup';
import { NPCChatModal } from './components/NPCChatModal';
import { NPCProximityIndicator } from './components/NPCProximityIndicator';
import { SettingsPanel } from './components/SettingsPanel';
import { OnboardingTutorial } from './components/OnboardingTutorial';
import { MapControls } from './components/MapControls';
import { MiniMap } from './components/MiniMap';
import ToastContainer from './components/ToastContainer';
import { socketService } from './services/socket.service';
import { supabaseService } from './services/supabase.service';
import { useGameStore } from './stores/gameStore';

function App() {
  const isLoading = useGameStore((state) => state.isLoading);

  useEffect(() => {
    // Initialize Supabase
    supabaseService.initialize();

    // Connect to WebSocket server
    socketService.connect();

    // Join the game with custom username if available
    const customUsername = localStorage.getItem('virtual-dev-custom-username');
    socketService.join(customUsername || undefined);

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

  // Show loading screen
  if (isLoading) {
    return (
      <div className="w-full h-full bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-gray-700 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-t-blue-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Virtual Dev</h2>
          <p className="text-gray-400 animate-pulse">Connecting to server...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-gray-900 relative">
      <GameCanvas />
      <ConnectionStatus />
      <SettingsPanel />
      <MapControls />
      <MiniMap />
      <ChatPanel />
      <EncounterPopup />
      <NPCProximityIndicator />
      <NPCChatModal />
      <OnboardingTutorial />
      <ToastContainer />

      {/* Instructions */}
      <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-sm rounded-lg px-4 py-3 text-white max-w-md">
        <h3 className="font-bold mb-2">Controls:</h3>
        <ul className="text-sm space-y-1">
          <li>• Move: WASD or Arrow Keys</li>
          <li>• Get close to other users to chat (150px radius)</li>
          <li>• Get close to NPCs (robot icons) to start conversations 🤖</li>
          <li>• Click the chat button on the right to open chat panel</li>
          <li>• Your username appears above your dot</li>
        </ul>
      </div>
    </div>
  );
}

export default App;

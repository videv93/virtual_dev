import { useEffect } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { ConnectionStatus } from './components/ConnectionStatus';
import { socketService } from './services/socket.service';

function App() {
  useEffect(() => {
    // Connect to WebSocket server
    socketService.connect();

    // Join the game
    socketService.join();

    // Cleanup on unmount
    return () => {
      socketService.disconnect();
    };
  }, []);

  return (
    <div className="w-full h-full bg-gray-900 relative">
      <GameCanvas />
      <ConnectionStatus />

      {/* Instructions */}
      <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-sm rounded-lg px-4 py-3 text-white max-w-md">
        <h3 className="font-bold mb-2">Controls:</h3>
        <ul className="text-sm space-y-1">
          <li>• Move: WASD or Arrow Keys</li>
          <li>• Your username appears above your dot</li>
          <li>• Other players will appear as colored dots</li>
        </ul>
      </div>
    </div>
  );
}

export default App;

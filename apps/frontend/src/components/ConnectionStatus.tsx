import { useGameStore } from '../stores/gameStore';

export function ConnectionStatus() {
  const isConnected = useGameStore((state) => state.isConnected);
  const currentUser = useGameStore((state) => state.currentUser);

  return (
    <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
      <div className="flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-lg px-4 py-2 text-white">
        <div
          className={`w-2 h-2 rounded-full ${
            isConnected ? 'bg-green-500' : 'bg-red-500'
          }`}
        />
        <span className="text-sm">
          {isConnected ? 'Connected' : 'Disconnected'}
        </span>
      </div>

      {currentUser && (
        <div className="bg-black/50 backdrop-blur-sm rounded-lg px-4 py-2 text-white">
          <span className="text-sm">{currentUser.username}</span>
        </div>
      )}
    </div>
  );
}

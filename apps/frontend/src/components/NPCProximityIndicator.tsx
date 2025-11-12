import { useGameStore } from '../stores/gameStore';

export const NPCProximityIndicator: React.FC = () => {
  const nearbyNPCs = useGameStore((state) => state.nearbyNPCs);
  const npcs = useGameStore((state) => state.npcs);
  const setActiveNPC = useGameStore((state) => state.setActiveNPC);

  // Get nearby NPC objects
  const nearbyNPCObjects = Array.from(nearbyNPCs)
    .map((npcId) => npcs.find((npc) => npc.id === npcId))
    .filter((npc) => npc !== undefined);

  if (nearbyNPCObjects.length === 0) return null;

  return (
    <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-40">
      <div className="bg-gray-900 border-2 border-cyan-500 rounded-lg shadow-xl p-4 max-w-md">
        <p className="text-cyan-400 text-sm font-semibold mb-2 text-center">
          🤖 NPCs Nearby
        </p>
        <div className="space-y-2">
          {nearbyNPCObjects.map((npc) => (
            <button
              key={npc!.id}
              onClick={() => setActiveNPC(npc!)}
              className="w-full bg-gray-800 hover:bg-cyan-900 border border-cyan-600 rounded-lg p-3 text-left transition-colors group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-semibold">{npc!.name}</p>
                  <p className="text-cyan-400 text-sm">{npc!.role}</p>
                </div>
                <div className="text-cyan-500 group-hover:text-cyan-300">
                  <svg
                    className="w-5 h-5"
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
                </div>
              </div>
            </button>
          ))}
        </div>
        <p className="text-gray-400 text-xs text-center mt-2">
          Click to start conversation
        </p>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { useGameStore } from '../stores/gameStore';
import { MAP_WIDTH, MAP_HEIGHT } from '@virtual-dev/shared';

const MINIMAP_WIDTH = 160;
const MINIMAP_HEIGHT = 120;
const SCALE_X = MINIMAP_WIDTH / MAP_WIDTH;
const SCALE_Y = MINIMAP_HEIGHT / MAP_HEIGHT;

export const MiniMap: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const currentUser = useGameStore((state) => state.currentUser);
  const users = useGameStore((state) => state.users);
  const npcs = useGameStore((state) => state.npcs);

  if (isCollapsed) {
    return (
      <div className="absolute top-20 right-4 z-10">
        <button
          onClick={() => setIsCollapsed(false)}
          className="bg-gray-800/90 backdrop-blur-sm hover:bg-gray-700/90 text-white rounded-lg px-3 py-2 transition-colors shadow-lg flex items-center gap-2 text-sm"
          aria-label="Show Mini-map"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          Map
        </button>
      </div>
    );
  }

  return (
    <div className="absolute top-20 right-4 z-10 bg-gray-800/90 backdrop-blur-sm rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gray-900/80 px-3 py-2 flex items-center justify-between border-b border-gray-700">
        <span className="text-xs font-semibold text-white">Mini Map</span>
        <button
          onClick={() => setIsCollapsed(true)}
          className="text-gray-400 hover:text-white transition-colors p-1"
          aria-label="Hide Mini-map"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Mini Map Canvas */}
      <div className="p-2">
        <svg
          width={MINIMAP_WIDTH}
          height={MINIMAP_HEIGHT}
          className="border border-gray-600 rounded"
          style={{ background: '#1a1a2e' }}
        >
          {/* Grid pattern */}
          <defs>
            <pattern
              id="minimap-grid"
              width={25 * SCALE_X}
              height={25 * SCALE_Y}
              patternUnits="userSpaceOnUse"
            >
              <path
                d={`M ${25 * SCALE_X} 0 L 0 0 0 ${25 * SCALE_Y}`}
                fill="none"
                stroke="rgba(22, 33, 62, 0.5)"
                strokeWidth="0.5"
              />
            </pattern>
          </defs>
          <rect width={MINIMAP_WIDTH} height={MINIMAP_HEIGHT} fill="url(#minimap-grid)" />

          {/* Map border */}
          <rect
            width={MINIMAP_WIDTH}
            height={MINIMAP_HEIGHT}
            fill="none"
            stroke="#4ecdc4"
            strokeWidth="1"
          />

          {/* NPCs */}
          {npcs.map((npc) => (
            <rect
              key={npc.id}
              x={npc.position.x * SCALE_X - 2}
              y={npc.position.y * SCALE_Y - 2}
              width={4}
              height={4}
              fill="#00d9ff"
              opacity={0.9}
            />
          ))}

          {/* Other Users */}
          {Array.from(users.values()).map((user) => {
            if (user.id === currentUser?.id) return null;
            return (
              <circle
                key={user.id}
                cx={user.position.x * SCALE_X}
                cy={user.position.y * SCALE_Y}
                r={3}
                fill={user.color}
                opacity={0.8}
              />
            );
          })}

          {/* Current User (highlighted) */}
          {currentUser && (
            <>
              {/* Pulse ring */}
              <circle
                cx={currentUser.position.x * SCALE_X}
                cy={currentUser.position.y * SCALE_Y}
                r={5}
                fill="none"
                stroke={currentUser.color}
                strokeWidth="1"
                opacity={0.6}
              >
                <animate
                  attributeName="r"
                  from="5"
                  to="8"
                  dur="1.5s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="opacity"
                  from="0.6"
                  to="0"
                  dur="1.5s"
                  repeatCount="indefinite"
                />
              </circle>
              {/* User dot */}
              <circle
                cx={currentUser.position.x * SCALE_X}
                cy={currentUser.position.y * SCALE_Y}
                r={3}
                fill={currentUser.color}
              />
              {/* White outline */}
              <circle
                cx={currentUser.position.x * SCALE_X}
                cy={currentUser.position.y * SCALE_Y}
                r={3}
                fill="none"
                stroke="white"
                strokeWidth="1"
              />
            </>
          )}
        </svg>

        {/* Legend */}
        <div className="mt-2 text-xs text-gray-400 space-y-1">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full border border-white"
              style={{ backgroundColor: currentUser?.color || '#fff' }}
            />
            <span>You</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gray-400" />
            <span>Users</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-cyan-400" />
            <span>NPCs</span>
          </div>
        </div>
      </div>
    </div>
  );
};

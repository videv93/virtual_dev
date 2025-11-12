import { useEffect, useState } from 'react';
import { useGameStore } from '../stores/gameStore';

export function EncounterPopup() {
  const encounterUserId = useGameStore((state) => state.encounterUserId);
  const setEncounterUserId = useGameStore((state) => state.setEncounterUserId);
  const users = useGameStore((state) => state.users);
  const setChatPanelOpen = useGameStore((state) => state.setChatPanelOpen);

  const [isVisible, setIsVisible] = useState(false);

  const encounterUser = encounterUserId ? users.get(encounterUserId) : null;

  // Auto-dismiss after 5 seconds
  useEffect(() => {
    if (encounterUserId) {
      setIsVisible(true);

      const timer = setTimeout(() => {
        handleDismiss();
      }, 5000);

      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [encounterUserId]);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => {
      setEncounterUserId(null);
    }, 300); // Wait for fade-out animation
  };

  const handleOpenChat = () => {
    setChatPanelOpen(true);
    handleDismiss();
  };

  if (!encounterUser) return null;

  return (
    <div
      className={`fixed top-24 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-300 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
      }`}
    >
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg shadow-2xl p-4 max-w-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 flex-1">
            {/* User color indicator */}
            <div
              className="w-12 h-12 rounded-full border-4 border-white shadow-lg flex items-center justify-center"
              style={{ backgroundColor: encounterUser.color }}
            >
              <span className="text-white text-xl font-bold">
                {encounterUser.username.charAt(0).toUpperCase()}
              </span>
            </div>

            {/* User info */}
            <div className="flex-1">
              <p className="text-white font-bold text-sm">New Encounter!</p>
              <p className="text-white text-lg font-bold">{encounterUser.username}</p>
              <p className="text-blue-100 text-xs mt-1">
                You can now chat with them
              </p>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="text-white hover:text-gray-200 transition-colors flex-shrink-0"
            aria-label="Dismiss"
          >
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Action button */}
        <button
          onClick={handleOpenChat}
          className="mt-3 w-full bg-white text-blue-600 font-semibold py-2 px-4 rounded-lg hover:bg-gray-100 transition-colors text-sm"
        >
          Open Chat
        </button>

        {/* Progress bar */}
        <div className="mt-3 h-1 bg-white bg-opacity-30 rounded-full overflow-hidden">
          <div
            className="h-full bg-white animate-shrink-width"
            style={{ animation: 'shrinkWidth 5s linear forwards' }}
          />
        </div>
      </div>

      <style>{`
        @keyframes shrinkWidth {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>
    </div>
  );
}

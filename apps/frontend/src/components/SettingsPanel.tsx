import React, { useState, useEffect } from 'react';
import { useGameStore } from '../stores/gameStore';

const PRESET_COLORS = [
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#45B7D1', // Blue
  '#FFA07A', // Light Salmon
  '#98D8C8', // Mint
  '#F7DC6F', // Yellow
  '#BB8FCE', // Purple
  '#85C1E2', // Sky Blue
  '#F8B739', // Orange
  '#52B788', // Green
];

export const SettingsPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [tempUsername, setTempUsername] = useState('');
  const [tempColor, setTempColor] = useState('');
  const currentUser = useGameStore((state) => state.currentUser);
  const addToast = useGameStore((state) => state.addToast);

  useEffect(() => {
    if (currentUser) {
      setTempUsername(currentUser.username);
      setTempColor(currentUser.color);
    }
  }, [currentUser, isOpen]);

  const handleSave = () => {
    if (!currentUser) return;

    // Validate username
    if (!tempUsername.trim()) {
      addToast('error', 'Username cannot be empty');
      return;
    }

    if (tempUsername.length < 3) {
      addToast('error', 'Username must be at least 3 characters');
      return;
    }

    if (tempUsername.length > 20) {
      addToast('error', 'Username must be at most 20 characters');
      return;
    }

    // Save to localStorage
    localStorage.setItem('virtual-dev-custom-username', tempUsername);
    localStorage.setItem('virtual-dev-custom-color', tempColor);

    // Update current user in store
    useGameStore.getState().setCurrentUser({
      ...currentUser,
      username: tempUsername,
      color: tempColor,
    });

    addToast('success', 'Settings saved! Changes will take effect after refresh.');
    setIsOpen(false);
  };

  const handleReset = () => {
    localStorage.removeItem('virtual-dev-custom-username');
    localStorage.removeItem('virtual-dev-custom-color');
    if (currentUser) {
      setTempUsername(currentUser.username);
      setTempColor(currentUser.color);
    }
    addToast('info', 'Settings reset! Refresh the page to see changes.');
  };

  if (!currentUser) return null;

  return (
    <>
      {/* Settings Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="absolute top-4 left-4 bg-gray-800/90 backdrop-blur-sm hover:bg-gray-700/90 text-white rounded-lg px-4 py-2 transition-colors flex items-center gap-2 z-10"
        aria-label="Open Settings"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        Settings
      </button>

      {/* Settings Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Settings</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white hover:bg-white/20 rounded-lg p-1 transition-colors"
                aria-label="Close Settings"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Username Customization */}
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  value={tempUsername}
                  onChange={(e) => setTempUsername(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your username"
                  maxLength={20}
                />
                <p className="mt-1 text-xs text-gray-400">
                  {tempUsername.length}/20 characters
                </p>
              </div>

              {/* Color Customization */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Avatar Color
                </label>
                <div className="grid grid-cols-5 gap-3">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setTempColor(color)}
                      className={`w-full aspect-square rounded-lg transition-all ${
                        tempColor === color
                          ? 'ring-4 ring-white ring-offset-2 ring-offset-gray-800 scale-110'
                          : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: color }}
                      aria-label={`Select color ${color}`}
                    />
                  ))}
                </div>
                <div className="mt-3">
                  <input
                    type="color"
                    value={tempColor}
                    onChange={(e) => setTempColor(e.target.value)}
                    className="w-full h-10 rounded-lg cursor-pointer"
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    Or choose a custom color
                  </p>
                </div>
              </div>

              {/* Preview */}
              <div className="bg-gray-700 rounded-lg p-4">
                <p className="text-sm text-gray-300 mb-2">Preview:</p>
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full"
                    style={{ backgroundColor: tempColor }}
                  />
                  <span className="text-white font-medium">{tempUsername || 'Your Username'}</span>
                </div>
              </div>

              {/* Info */}
              <div className="bg-blue-900/30 border border-blue-700/50 rounded-lg p-3">
                <p className="text-xs text-blue-200">
                  <strong>Note:</strong> Changes are saved locally on your device. You'll need to refresh the page for changes to fully take effect.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-900 px-6 py-4 flex gap-3">
              <button
                onClick={handleReset}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Reset
              </button>
              <button
                onClick={handleSave}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-medium transition-all"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

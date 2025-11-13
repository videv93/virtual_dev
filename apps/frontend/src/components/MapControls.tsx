import React from 'react';

export const MapControls: React.FC = () => {
  const handleZoomIn = () => {
    if ((window as any).phaserZoomIn) {
      (window as any).phaserZoomIn();
    }
  };

  const handleZoomOut = () => {
    if ((window as any).phaserZoomOut) {
      (window as any).phaserZoomOut();
    }
  };

  const handleResetView = () => {
    if ((window as any).phaserResetView) {
      (window as any).phaserResetView();
    }
  };

  return (
    <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-10">
      {/* Zoom In Button */}
      <button
        onClick={handleZoomIn}
        className="bg-gray-800/90 backdrop-blur-sm hover:bg-gray-700/90 text-white rounded-lg p-3 transition-colors shadow-lg"
        aria-label="Zoom In"
        title="Zoom In (or use mouse wheel)"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
        </svg>
      </button>

      {/* Zoom Out Button */}
      <button
        onClick={handleZoomOut}
        className="bg-gray-800/90 backdrop-blur-sm hover:bg-gray-700/90 text-white rounded-lg p-3 transition-colors shadow-lg"
        aria-label="Zoom Out"
        title="Zoom Out (or use mouse wheel)"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
        </svg>
      </button>

      {/* Reset View Button */}
      <button
        onClick={handleResetView}
        className="bg-gray-800/90 backdrop-blur-sm hover:bg-gray-700/90 text-white rounded-lg p-3 transition-colors shadow-lg"
        aria-label="Reset View"
        title="Reset View"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
        </svg>
      </button>

      {/* Help Text - Desktop Only */}
      <div className="hidden md:block bg-gray-800/90 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-gray-300 max-w-[200px] shadow-lg">
        <p className="font-semibold mb-1">Map Controls:</p>
        <ul className="space-y-1">
          <li>• Mouse wheel: Zoom</li>
          <li>• Right-click + drag: Pan</li>
        </ul>
      </div>
    </div>
  );
};

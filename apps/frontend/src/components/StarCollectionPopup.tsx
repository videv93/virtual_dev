import { useGameStore } from '../stores/gameStore';

export function StarCollectionPopup() {
  const showStarPopup = useGameStore((state) => state.showStarPopup);
  const collectedStarsCount = useGameStore((state) => state.collectedStarsCount);

  if (!showStarPopup) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
      <div className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 animate-bounce pointer-events-auto">
        <div className="text-center">
          <div className="text-6xl mb-4">⭐</div>
          <h2 className="text-3xl font-bold text-white mb-2">
            Congratulations!
          </h2>
          <p className="text-xl text-white mb-4">
            You collected a star!
          </p>
          <div className="bg-white/20 rounded-lg p-4">
            <p className="text-2xl font-bold text-white">
              Total Stars: {collectedStarsCount}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

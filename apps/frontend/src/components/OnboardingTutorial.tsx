import React, { useState, useEffect } from 'react';

const TUTORIAL_STORAGE_KEY = 'virtual-dev-tutorial-completed';

export const OnboardingTutorial: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    // Check if tutorial has been completed
    const tutorialCompleted = localStorage.getItem(TUTORIAL_STORAGE_KEY);
    if (!tutorialCompleted) {
      setIsVisible(true);
    }
  }, []);

  const tutorialSteps = [
    {
      title: 'Welcome to Virtual Dev! 👋',
      content: (
        <div className="space-y-4">
          <p className="text-gray-300">
            A virtual space where developers can hang out, collaborate, and interact with AI-powered NPCs.
          </p>
          <div className="bg-blue-900/30 border border-blue-700/50 rounded-lg p-4">
            <p className="text-sm text-blue-200">
              <strong>💡 Tip:</strong> You can customize your username and avatar color in the Settings panel (top-left corner).
            </p>
          </div>
        </div>
      ),
    },
    {
      title: 'Movement Controls 🎮',
      content: (
        <div className="space-y-4">
          <p className="text-gray-300 mb-4">
            Navigate the virtual space using your keyboard:
          </p>
          <div className="bg-gray-700 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="bg-gray-600 rounded px-3 py-2 font-mono text-sm">WASD</div>
              <span className="text-gray-300">or</span>
              <div className="bg-gray-600 rounded px-3 py-2 font-mono text-sm">Arrow Keys</div>
            </div>
            <p className="text-sm text-gray-400">
              Use these keys to move your avatar around the map. You'll see your colored dot move in real-time!
            </p>
          </div>
          <div className="bg-yellow-900/30 border border-yellow-700/50 rounded-lg p-4">
            <p className="text-sm text-yellow-200">
              <strong>⚠️ Note:</strong> Your username will appear above your dot. Other users can see you moving in real-time.
            </p>
          </div>
        </div>
      ),
    },
    {
      title: 'Proximity Chat 💬',
      content: (
        <div className="space-y-4">
          <p className="text-gray-300">
            Chat with other users who are nearby (within 150px radius):
          </p>
          <div className="bg-gray-700 rounded-lg p-4 space-y-3">
            <div className="flex items-start gap-3">
              <span className="text-2xl">1️⃣</span>
              <div>
                <p className="font-medium text-white">Get Close</p>
                <p className="text-sm text-gray-400">Move near another user until you see an encounter notification.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl">2️⃣</span>
              <div>
                <p className="font-medium text-white">Open Chat Panel</p>
                <p className="text-sm text-gray-400">Click the chat button on the right side to open the chat panel.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl">3️⃣</span>
              <div>
                <p className="font-medium text-white">Start Chatting</p>
                <p className="text-sm text-gray-400">Send messages to nearby users. Messages are saved and synced in real-time!</p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'AI NPCs 🤖',
      content: (
        <div className="space-y-4">
          <p className="text-gray-300">
            Interact with AI-powered NPCs scattered around the map:
          </p>
          <div className="bg-gray-700 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-cyan-400 rounded" style={{
                clipPath: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)'
              }} />
              <p className="text-sm text-gray-300">
                Look for <strong className="text-cyan-400">cyan robot icons</strong> on the map
              </p>
            </div>
            <p className="text-sm text-gray-400">
              Each NPC has a unique personality and can help with different tasks:
            </p>
            <ul className="list-disc list-inside text-sm text-gray-400 space-y-1 ml-4">
              <li><strong className="text-white">Code Reviewer</strong> - Reviews your code and suggests improvements</li>
              <li><strong className="text-white">Debug Helper</strong> - Helps you debug tricky issues</li>
              <li><strong className="text-white">Career Mentor</strong> - Provides career advice and guidance</li>
            </ul>
          </div>
          <div className="bg-purple-900/30 border border-purple-700/50 rounded-lg p-4">
            <p className="text-sm text-purple-200">
              <strong>✨ Pro Tip:</strong> Get close to an NPC to see a "Start Conversation" button. Click it to begin chatting with the AI!
            </p>
          </div>
        </div>
      ),
    },
    {
      title: "You're All Set! 🚀",
      content: (
        <div className="space-y-4">
          <p className="text-gray-300">
            You're ready to explore Virtual Dev! Here's a quick recap:
          </p>
          <div className="bg-gray-700 rounded-lg p-4 space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-green-400">✓</span>
              <span className="text-gray-300">Move with <strong className="text-white">WASD</strong> or <strong className="text-white">Arrow Keys</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-400">✓</span>
              <span className="text-gray-300">Chat with nearby users (150px radius)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-400">✓</span>
              <span className="text-gray-300">Find and talk to AI NPCs (cyan robots)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-400">✓</span>
              <span className="text-gray-300">Customize your profile in Settings</span>
            </div>
          </div>
          <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-700/50 rounded-lg p-4">
            <p className="text-sm text-blue-200 text-center">
              <strong>Need help?</strong> Press the Settings button to review your options, or just start exploring!
            </p>
          </div>
        </div>
      ),
    },
  ];

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClose = () => {
    if (dontShowAgain) {
      localStorage.setItem(TUTORIAL_STORAGE_KEY, 'true');
    }
    setIsVisible(false);
  };

  const handleSkip = () => {
    localStorage.setItem(TUTORIAL_STORAGE_KEY, 'true');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  const currentStepData = tutorialSteps[currentStep];

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">{currentStepData.title}</h2>
            <button
              onClick={handleSkip}
              className="text-white/80 hover:text-white text-sm underline transition-colors"
            >
              Skip Tutorial
            </button>
          </div>
          {/* Progress Indicator */}
          <div className="mt-4 flex gap-2">
            {tutorialSteps.map((_, index) => (
              <div
                key={index}
                className={`h-1 flex-1 rounded ${
                  index === currentStep
                    ? 'bg-white'
                    : index < currentStep
                    ? 'bg-white/60'
                    : 'bg-white/20'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {currentStepData.content}
        </div>

        {/* Footer */}
        <div className="bg-gray-900 px-6 py-4">
          {/* Don't Show Again Checkbox */}
          {currentStep === tutorialSteps.length - 1 && (
            <div className="mb-4 flex items-center gap-2">
              <input
                type="checkbox"
                id="dontShowAgain"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-2 focus:ring-blue-500"
              />
              <label htmlFor="dontShowAgain" className="text-sm text-gray-300 cursor-pointer">
                Don't show this tutorial again
              </label>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              Previous
            </button>
            <div className="flex-1" />
            <span className="text-sm text-gray-400 self-center">
              {currentStep + 1} of {tutorialSteps.length}
            </span>
            <div className="flex-1" />
            {currentStep < tutorialSteps.length - 1 ? (
              <button
                onClick={handleNext}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-medium transition-all"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleClose}
                className="px-6 py-2 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white rounded-lg font-medium transition-all"
              >
                Get Started!
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

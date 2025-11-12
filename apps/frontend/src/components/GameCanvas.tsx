import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { GameScene } from '../scenes/GameScene';
import { MAP_WIDTH, MAP_HEIGHT } from '@virtual-dev/shared';

export function GameCanvas() {
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (gameRef.current) return;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: MAP_WIDTH,
      height: MAP_HEIGHT,
      parent: 'game-container',
      backgroundColor: '#1a1a2e',
      scene: [GameScene],
      physics: {
        default: 'arcade',
        arcade: {
          debug: false,
        },
      },
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
    };

    gameRef.current = new Phaser.Game(config);

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  return (
    <div
      id="game-container"
      className="flex items-center justify-center w-full h-full"
    />
  );
}

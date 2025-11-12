# Phaser.js 3 Implementation Guide for Virtual Dev

## Overview

This guide covers everything you need to implement the 2D virtual world using Phaser.js 3, from basic setup to advanced features like multi-player rendering and smooth movement.

---

## Why Phaser.js 3?

### Advantages for Virtual Dev

✅ **Mature Framework**: 10+ years of development  
✅ **Excellent Performance**: Optimized for 2D games  
✅ **Built-in Physics**: Arcade physics for collision detection  
✅ **Scene Management**: Easy to organize different game states  
✅ **Input Handling**: Mouse, keyboard, touch support  
✅ **Great Documentation**: Comprehensive API docs and examples  
✅ **Active Community**: Large ecosystem of plugins and tutorials  
✅ **React Compatible**: Easy to integrate with React  

### Perfect for Virtual Dev Because:
- Top-down 2D view (Phaser's specialty)
- Need collision detection (built-in)
- Real-time multiplayer rendering (handles well)
- Simple graphics (circles, labels, grids)
- Canvas/WebGL rendering (automatic)

---

## Installation & Setup

### 1. Install Phaser.js 3

```bash
npm install phaser@3.70.0
npm install --save-dev @types/phaser
```

### 2. React + Phaser Integration

Phaser games run in their own canvas, so we need to properly integrate with React:

**Approach: Mount Phaser in useEffect**

```typescript
// src/game/PhaserGame.tsx
import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { GameScene } from './GameScene';

export function PhaserGame() {
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    // Only create game once
    if (gameRef.current) return;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,          // Use WebGL, fallback to Canvas
      width: 800,
      height: 600,
      parent: 'game-container',   // DOM element ID
      backgroundColor: '#1a1a1a',
      scene: [GameScene],
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { x: 0, y: 0 }, // No gravity for top-down
          debug: false              // Set true for collision debugging
        }
      },
      scale: {
        mode: Phaser.Scale.FIT,   // Fit to container
        autoCenter: Phaser.Scale.CENTER_BOTH
      }
    };

    gameRef.current = new Phaser.Game(config);

    // Cleanup on unmount
    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return (
    <div 
      id="game-container" 
      className="w-full h-full"
    />
  );
}
```

---

## GameScene Implementation

### Basic Scene Structure

```typescript
// src/game/GameScene.ts
import Phaser from 'phaser';
import { useGameStore } from '../store/gameStore';
import { socket } from '../services/socket';

export class GameScene extends Phaser.Scene {
  // Player reference
  private playerDot?: Phaser.GameObjects.Arc;
  private playerLabel?: Phaser.GameObjects.Text;
  
  // Other players
  private otherPlayers: Map<string, {
    dot: Phaser.GameObjects.Arc;
    label: Phaser.GameObjects.Text;
  }> = new Map();
  
  // Input
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd?: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };
  
  constructor() {
    super('GameScene');
  }

  preload() {
    // Load any assets here (images, sprites, etc.)
    // For MVP, we're using pure graphics, so nothing to load
  }

  create() {
    this.createMap();
    this.setupInput();
    this.createPlayer();
    this.setupMultiplayer();
  }

  update(time: number, delta: number) {
    this.handlePlayerMovement(delta);
    this.updateOtherPlayers();
  }
  
  // Implement these methods below...
}
```

---

## Creating the Map

### 1. Background and Grid

```typescript
private createMap() {
  // Background
  const bg = this.add.rectangle(
    400, 300,        // x, y (center)
    800, 600,        // width, height
    0x1a1a1a         // color (dark gray)
  );
  
  // Grid overlay
  this.createGrid();
  
  // Optional: Map boundaries (invisible collision box)
  this.createBoundaries();
}

private createGrid() {
  const graphics = this.add.graphics();
  graphics.lineStyle(1, 0x333333, 0.5); // width, color, alpha
  
  const gridSize = 50;
  
  // Vertical lines
  for (let x = 0; x <= 800; x += gridSize) {
    graphics.lineBetween(x, 0, x, 600);
  }
  
  // Horizontal lines
  for (let y = 0; y <= 600; y += gridSize) {
    graphics.lineBetween(0, y, 800, y);
  }
}

private createBoundaries() {
  // Create invisible walls at map edges
  const walls = this.add.rectangle(400, 300, 800, 600);
  this.physics.add.existing(walls, true); // true = static body
}
```

---

## Creating the Player

### 1. Render Player Dot

```typescript
private createPlayer() {
  const currentUser = useGameStore.getState().currentUser;
  if (!currentUser) return;
  
  const { position, avatarColor, username } = currentUser;
  
  // Create player dot
  this.playerDot = this.add.circle(
    position.x,
    position.y,
    10,                                    // radius
    parseInt(avatarColor.replace('#', ''), 16) // convert hex to number
  );
  
  // Add physics body for collision
  this.physics.add.existing(this.playerDot);
  
  // Make sure player stays within bounds
  (this.playerDot.body as Phaser.Physics.Arcade.Body).setCollideWorldBounds(true);
  
  // Create username label
  this.playerLabel = this.add.text(
    position.x,
    position.y - 20,   // above the dot
    username,
    {
      fontSize: '12px',
      color: '#ffffff',
      backgroundColor: '#00000088', // semi-transparent black
      padding: { x: 4, y: 2 }
    }
  );
  this.playerLabel.setOrigin(0.5, 1); // center horizontally, bottom align
}
```

---

## Input Handling

### 1. Keyboard Controls

```typescript
private setupInput() {
  // Arrow keys
  this.cursors = this.input.keyboard?.createCursorKeys();
  
  // WASD keys
  if (this.input.keyboard) {
    this.wasd = {
      W: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
    };
  }
  
  // Mouse/touch click-to-move
  this.input.on('pointerdown', this.handleClick, this);
}

private handlePlayerMovement(delta: number) {
  if (!this.playerDot || !this.cursors) return;
  
  const speed = 200; // pixels per second
  const velocity = { x: 0, y: 0 };
  
  // Check arrow keys
  if (this.cursors.left.isDown) velocity.x = -speed;
  if (this.cursors.right.isDown) velocity.x = speed;
  if (this.cursors.up.isDown) velocity.y = -speed;
  if (this.cursors.down.isDown) velocity.y = speed;
  
  // Check WASD
  if (this.wasd) {
    if (this.wasd.A.isDown) velocity.x = -speed;
    if (this.wasd.D.isDown) velocity.x = speed;
    if (this.wasd.W.isDown) velocity.y = -speed;
    if (this.wasd.S.isDown) velocity.y = speed;
  }
  
  // Normalize diagonal movement
  if (velocity.x !== 0 && velocity.y !== 0) {
    velocity.x *= 0.707; // 1/√2
    velocity.y *= 0.707;
  }
  
  // Apply velocity
  const body = this.playerDot.body as Phaser.Physics.Arcade.Body;
  body.setVelocity(velocity.x, velocity.y);
  
  // Update label position
  if (this.playerLabel) {
    this.playerLabel.setPosition(this.playerDot.x, this.playerDot.y - 20);
  }
  
  // Send position to server (throttled in practice)
  if (velocity.x !== 0 || velocity.y !== 0) {
    this.sendPositionUpdate();
  }
}
```

### 2. Click-to-Move

```typescript
private targetPosition?: { x: number; y: number };

private handleClick(pointer: Phaser.Input.Pointer) {
  this.targetPosition = {
    x: pointer.x,
    y: pointer.y
  };
}

// In update() method:
private moveToTarget() {
  if (!this.playerDot || !this.targetPosition) return;
  
  const distance = Phaser.Math.Distance.Between(
    this.playerDot.x,
    this.playerDot.y,
    this.targetPosition.x,
    this.targetPosition.y
  );
  
  // Reached target
  if (distance < 5) {
    this.targetPosition = undefined;
    const body = this.playerDot.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
    return;
  }
  
  // Move towards target
  const speed = 200;
  const angle = Phaser.Math.Angle.Between(
    this.playerDot.x,
    this.playerDot.y,
    this.targetPosition.x,
    this.targetPosition.y
  );
  
  const body = this.playerDot.body as Phaser.Physics.Arcade.Body;
  body.setVelocity(
    Math.cos(angle) * speed,
    Math.sin(angle) * speed
  );
}
```

---

## Multiplayer - Rendering Other Players

### 1. Create Other Player

```typescript
private setupMultiplayer() {
  // Subscribe to game store changes
  useGameStore.subscribe(
    (state) => state.otherUsers,
    (otherUsers) => {
      this.updateOtherPlayers();
    }
  );
  
  // Listen to Socket.io events
  socket.on('users:update', (users) => {
    users.forEach((user: any) => {
      if (user.sessionId === useGameStore.getState().currentUser?.sessionId) {
        return; // Skip self
      }
      this.createOrUpdateOtherPlayer(user);
    });
  });
  
  socket.on('user:moved', (data) => {
    this.moveOtherPlayer(data.sessionId, data.position);
  });
  
  socket.on('user:disconnected', (data) => {
    this.removeOtherPlayer(data.sessionId);
  });
}

private createOrUpdateOtherPlayer(user: any) {
  const existing = this.otherPlayers.get(user.sessionId);
  
  if (existing) {
    // Update existing player
    existing.dot.setPosition(user.position.x, user.position.y);
    existing.label.setPosition(user.position.x, user.position.y - 20);
    return;
  }
  
  // Create new player
  const dot = this.add.circle(
    user.position.x,
    user.position.y,
    10,
    parseInt(user.avatarColor.replace('#', ''), 16)
  );
  
  const label = this.add.text(
    user.position.x,
    user.position.y - 20,
    user.username,
    {
      fontSize: '12px',
      color: '#ffffff',
      backgroundColor: '#00000088',
      padding: { x: 4, y: 2 }
    }
  );
  label.setOrigin(0.5, 1);
  
  this.otherPlayers.set(user.sessionId, { dot, label });
}

private removeOtherPlayer(sessionId: string) {
  const player = this.otherPlayers.get(sessionId);
  if (!player) return;
  
  player.dot.destroy();
  player.label.destroy();
  this.otherPlayers.delete(sessionId);
}
```

### 2. Smooth Movement Interpolation

For smooth multiplayer movement, use Phaser's built-in tweens:

```typescript
private moveOtherPlayer(sessionId: string, position: { x: number; y: number }) {
  const player = this.otherPlayers.get(sessionId);
  if (!player) return;
  
  // Smooth interpolation using tweens
  this.tweens.add({
    targets: player.dot,
    x: position.x,
    y: position.y,
    duration: 100,  // 100ms interpolation
    ease: 'Linear'
  });
  
  this.tweens.add({
    targets: player.label,
    x: position.x,
    y: position.y - 20,
    duration: 100,
    ease: 'Linear'
  });
}
```

---

## Proximity Detection

### Using Phaser's Physics for Proximity

```typescript
private checkProximity() {
  if (!this.playerDot) return;
  
  const proximityRadius = 150;
  
  // Check proximity to other players
  this.otherPlayers.forEach((player, sessionId) => {
    const distance = Phaser.Math.Distance.Between(
      this.playerDot!.x,
      this.playerDot!.y,
      player.dot.x,
      player.dot.y
    );
    
    if (distance < proximityRadius) {
      this.onPlayerNearby(sessionId);
    } else {
      this.onPlayerLeft(sessionId);
    }
  });
}

private nearbyPlayers = new Set<string>();

private onPlayerNearby(sessionId: string) {
  if (this.nearbyPlayers.has(sessionId)) return;
  
  this.nearbyPlayers.add(sessionId);
  
  // Emit event to React
  window.dispatchEvent(new CustomEvent('proximity:enter', {
    detail: { sessionId }
  }));
}

private onPlayerLeft(sessionId: string) {
  if (!this.nearbyPlayers.has(sessionId)) return;
  
  this.nearbyPlayers.delete(sessionId);
  
  // Emit event to React
  window.dispatchEvent(new CustomEvent('proximity:exit', {
    detail: { sessionId }
  }));
}
```

---

## Collision Detection

### Colliding with Map Boundaries

```typescript
private createBoundaries() {
  // Create static rectangles for walls
  const topWall = this.add.rectangle(400, -10, 800, 20);
  const bottomWall = this.add.rectangle(400, 610, 800, 20);
  const leftWall = this.add.rectangle(-10, 300, 20, 600);
  const rightWall = this.add.rectangle(810, 300, 20, 600);
  
  // Make them physics bodies
  this.physics.add.existing(topWall, true);
  this.physics.add.existing(bottomWall, true);
  this.physics.add.existing(leftWall, true);
  this.physics.add.existing(rightWall, true);
  
  // Collide player with walls
  if (this.playerDot) {
    this.physics.add.collider(this.playerDot, [topWall, bottomWall, leftWall, rightWall]);
  }
}

// Alternatively, use world bounds:
private createPlayer() {
  // ... create player dot ...
  
  const body = this.playerDot.body as Phaser.Physics.Arcade.Body;
  body.setCollideWorldBounds(true);  // Can't leave world
}
```

---

## Performance Optimization

### 1. Object Pooling

For frequently created/destroyed objects:

```typescript
// Instead of creating/destroying labels repeatedly
private labelPool: Phaser.GameObjects.Text[] = [];

private getLabel(): Phaser.GameObjects.Text {
  let label = this.labelPool.pop();
  if (!label) {
    label = this.add.text(0, 0, '', { fontSize: '12px' });
  }
  label.setActive(true).setVisible(true);
  return label;
}

private releaseLabel(label: Phaser.GameObjects.Text) {
  label.setActive(false).setVisible(false);
  this.labelPool.push(label);
}
```

### 2. Culling Off-Screen Objects

```typescript
private updateOtherPlayers() {
  const camera = this.cameras.main;
  const bounds = camera.worldView;
  
  this.otherPlayers.forEach((player) => {
    const inView = bounds.contains(player.dot.x, player.dot.y);
    player.dot.setVisible(inView);
    player.label.setVisible(inView);
  });
}
```

### 3. Throttle Position Updates

```typescript
private lastPositionSent = 0;
private positionUpdateInterval = 100; // ms

private sendPositionUpdate() {
  const now = Date.now();
  if (now - this.lastPositionSent < this.positionUpdateInterval) {
    return; // Too soon
  }
  
  this.lastPositionSent = now;
  
  socket.emit('move', {
    position: {
      x: Math.round(this.playerDot!.x),
      y: Math.round(this.playerDot!.y)
    }
  });
}
```

---

## Camera Features (Optional)

### 1. Follow Player

```typescript
private setupCamera() {
  if (!this.playerDot) return;
  
  this.cameras.main.startFollow(this.playerDot, true, 0.1, 0.1);
  this.cameras.main.setZoom(1);
}
```

### 2. Zoom Controls

```typescript
private setupZoomControls() {
  // Zoom in: Z key
  this.input.keyboard?.on('keydown-Z', () => {
    const newZoom = Math.min(this.cameras.main.zoom + 0.1, 2);
    this.cameras.main.setZoom(newZoom);
  });
  
  // Zoom out: X key
  this.input.keyboard?.on('keydown-X', () => {
    const newZoom = Math.max(this.cameras.main.zoom - 0.1, 0.5);
    this.cameras.main.setZoom(newZoom);
  });
}
```

---

## Communicating Between Phaser and React

### Custom Events

```typescript
// In Phaser Scene:
window.dispatchEvent(new CustomEvent('player:moved', {
  detail: { x: this.playerDot.x, y: this.playerDot.y }
}));

// In React Component:
useEffect(() => {
  const handler = (e: CustomEvent) => {
    console.log('Player moved:', e.detail);
  };
  
  window.addEventListener('player:moved', handler as EventListener);
  return () => window.removeEventListener('player:moved', handler as EventListener);
}, []);
```

### Direct Scene Access

```typescript
// Store scene reference
export let gameScene: GameScene | null = null;

export class GameScene extends Phaser.Scene {
  create() {
    gameScene = this;
    // ...
  }
}

// Access from React:
import { gameScene } from './GameScene';

if (gameScene) {
  gameScene.movePlayer(x, y);
}
```

---

## Common Issues & Solutions

### Issue: Game doesn't render
**Solution:** Make sure parent div has explicit width/height in CSS

### Issue: Physics not working
**Solution:** Ensure `physics.add.existing()` is called on game objects

### Issue: Input not responding
**Solution:** Check if canvas has focus. Add `tabIndex={0}` to container.

### Issue: Performance drops with many players
**Solution:** Implement culling and object pooling

### Issue: Multiplayer positions jumpy
**Solution:** Use tweens for smooth interpolation

---

## Next Steps

1. ✅ Complete basic GameScene
2. ⬜ Add player movement
3. ⬜ Implement multiplayer rendering
4. ⬜ Add proximity detection
5. ⬜ Optimize performance
6. ⬜ Add visual polish (animations, effects)

---

## Resources

- [Phaser 3 Official Docs](https://photonstorm.github.io/phaser3-docs/)
- [Phaser 3 Examples](https://phaser.io/examples)
- [Phaser Discord Community](https://discord.gg/phaser)
- [Making Your First Phaser 3 Game](https://phaser.io/tutorials/making-your-first-phaser-3-game)

---

*Phaser.js Guide Version: 1.0*  
*Last Updated: November 12, 2025*  
*Project: Virtual Dev*

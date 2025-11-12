import Phaser from 'phaser';
import { User, MAP_WIDTH, MAP_HEIGHT, MOVEMENT_SPEED } from '@virtual-dev/shared';
import { useGameStore } from '../stores/gameStore';
import { socketService } from '../services/socket.service';

export class GameScene extends Phaser.Scene {
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd?: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };
  private currentUserSprite?: Phaser.GameObjects.Arc;
  private currentUserText?: Phaser.GameObjects.Text;
  private otherUsersSprites: Map<string, { sprite: Phaser.GameObjects.Arc; text: Phaser.GameObjects.Text }> = new Map();
  private lastPosition = { x: 0, y: 0 };
  private positionUpdateTimer = 0;
  private readonly POSITION_UPDATE_INTERVAL = 100; // ms (10 updates per second)

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    // Create map background
    this.createMap();

    // Set up input
    this.setupInput();

    // Subscribe to game store changes
    this.setupStoreSubscription();

    // Initial render
    this.renderCurrentUser();
    this.renderOtherUsers();
  }

  private createMap(): void {
    // Background
    this.add.rectangle(
      MAP_WIDTH / 2,
      MAP_HEIGHT / 2,
      MAP_WIDTH,
      MAP_HEIGHT,
      0x1a1a2e
    );

    // Grid lines
    const gridSize = 50;
    const graphics = this.add.graphics();
    graphics.lineStyle(1, 0x16213e, 0.5);

    // Vertical lines
    for (let x = 0; x <= MAP_WIDTH; x += gridSize) {
      graphics.lineBetween(x, 0, x, MAP_HEIGHT);
    }

    // Horizontal lines
    for (let y = 0; y <= MAP_HEIGHT; y += gridSize) {
      graphics.lineBetween(0, y, MAP_WIDTH, y);
    }

    // Border
    graphics.lineStyle(2, 0x4ecdc4, 1);
    graphics.strokeRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
  }

  private setupInput(): void {
    // Arrow keys
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();

      // WASD keys
      this.wasd = {
        W: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        A: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        S: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        D: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      };
    }
  }

  private setupStoreSubscription(): void {
    // Subscribe to user changes
    useGameStore.subscribe(() => {
      this.renderCurrentUser();
      this.renderOtherUsers();
    });
  }

  private renderCurrentUser(): void {
    const currentUser = useGameStore.getState().currentUser;
    if (!currentUser) return;

    if (!this.currentUserSprite) {
      // Create sprite
      this.currentUserSprite = this.add.circle(
        currentUser.position.x,
        currentUser.position.y,
        15,
        parseInt(currentUser.color.replace('#', ''), 16)
      );

      // Create username text
      this.currentUserText = this.add.text(
        currentUser.position.x,
        currentUser.position.y - 25,
        currentUser.username,
        {
          fontSize: '12px',
          color: '#ffffff',
          backgroundColor: '#000000',
          padding: { x: 4, y: 2 },
        }
      );
      this.currentUserText.setOrigin(0.5, 0.5);

      this.lastPosition = { ...currentUser.position };
    } else {
      // Update position
      this.currentUserSprite.setPosition(currentUser.position.x, currentUser.position.y);
      this.currentUserText?.setPosition(currentUser.position.x, currentUser.position.y - 25);
    }
  }

  private renderOtherUsers(): void {
    const users = useGameStore.getState().users;
    const currentUserId = useGameStore.getState().currentUser?.id;

    // Remove sprites for users that left
    this.otherUsersSprites.forEach((value, userId) => {
      if (!users.has(userId)) {
        value.sprite.destroy();
        value.text.destroy();
        this.otherUsersSprites.delete(userId);
      }
    });

    // Add or update sprites for current users
    users.forEach((user: User) => {
      if (user.id === currentUserId) return;

      const existing = this.otherUsersSprites.get(user.id);

      if (!existing) {
        // Create new sprite
        const sprite = this.add.circle(
          user.position.x,
          user.position.y,
          15,
          parseInt(user.color.replace('#', ''), 16)
        );

        const text = this.add.text(user.position.x, user.position.y - 25, user.username, {
          fontSize: '12px',
          color: '#ffffff',
          backgroundColor: '#000000',
          padding: { x: 4, y: 2 },
        });
        text.setOrigin(0.5, 0.5);

        this.otherUsersSprites.set(user.id, { sprite, text });
      } else {
        // Update position with smooth interpolation
        this.tweens.add({
          targets: existing.sprite,
          x: user.position.x,
          y: user.position.y,
          duration: 100,
          ease: 'Linear',
        });
        this.tweens.add({
          targets: existing.text,
          x: user.position.x,
          y: user.position.y - 25,
          duration: 100,
          ease: 'Linear',
        });
      }
    });
  }

  update(_time: number, delta: number): void {
    if (!this.currentUserSprite || !this.cursors || !this.wasd) return;

    const currentUser = useGameStore.getState().currentUser;
    if (!currentUser) return;

    let velocityX = 0;
    let velocityY = 0;

    // Check input
    if (this.cursors.left.isDown || this.wasd.A.isDown) {
      velocityX = -1;
    } else if (this.cursors.right.isDown || this.wasd.D.isDown) {
      velocityX = 1;
    }

    if (this.cursors.up.isDown || this.wasd.W.isDown) {
      velocityY = -1;
    } else if (this.cursors.down.isDown || this.wasd.S.isDown) {
      velocityY = 1;
    }

    // Normalize diagonal movement
    if (velocityX !== 0 && velocityY !== 0) {
      velocityX *= 0.707;
      velocityY *= 0.707;
    }

    // Calculate new position
    const speed = (MOVEMENT_SPEED * delta) / 1000;
    let newX = currentUser.position.x + velocityX * speed;
    let newY = currentUser.position.y + velocityY * speed;

    // Boundary collision
    const radius = 15;
    newX = Phaser.Math.Clamp(newX, radius, MAP_WIDTH - radius);
    newY = Phaser.Math.Clamp(newY, radius, MAP_HEIGHT - radius);

    // Update position locally
    currentUser.position.x = newX;
    currentUser.position.y = newY;
    useGameStore.getState().setCurrentUser(currentUser);

    // Send position update to server (throttled)
    this.positionUpdateTimer += delta;
    if (
      this.positionUpdateTimer >= this.POSITION_UPDATE_INTERVAL &&
      (Math.abs(newX - this.lastPosition.x) > 1 || Math.abs(newY - this.lastPosition.y) > 1)
    ) {
      socketService.move({ x: newX, y: newY });
      this.lastPosition = { x: newX, y: newY };
      this.positionUpdateTimer = 0;
    }
  }
}

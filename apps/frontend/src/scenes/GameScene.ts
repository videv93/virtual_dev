import Phaser from 'phaser';
import { User, MAP_WIDTH, MAP_HEIGHT, MOVEMENT_SPEED, PROXIMITY_RADIUS, NPCConfig } from '@virtual-dev/shared';
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
  private npcSprites: Map<string, { sprite: Phaser.GameObjects.Graphics; text: Phaser.GameObjects.Text; nameText: Phaser.GameObjects.Text }> = new Map();
  private starSprites: Map<string, Phaser.GameObjects.Graphics> = new Map();
  private lastPosition = { x: 0, y: 0 };
  private positionUpdateTimer = 0;
  private readonly POSITION_UPDATE_INTERVAL = 100; // ms (10 updates per second)

  // Star spawning
  private starSpawnTimer = 0;
  private readonly STAR_SPAWN_INTERVAL = 60000; // 60 seconds = 1 minute
  private readonly STAR_LIFETIME = 60000; // 60 seconds = 1 minute

  // Camera controls
  private isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private readonly MIN_ZOOM = 0.5;
  private readonly MAX_ZOOM = 2;
  private readonly ZOOM_STEP = 0.1;

  // Touch controls for mobile
  private touchVelocity = { x: 0, y: 0 };
  private touchStartPos = { x: 0, y: 0 };
  private isTouchMovement = false;
  private readonly TOUCH_DEAD_ZONE = 20; // Minimum distance before registering as movement

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    // Create map background
    this.createMap();

    // Set up input
    this.setupInput();

    // Set up camera controls
    this.setupCameraControls();

    // Subscribe to game store changes
    this.setupStoreSubscription();

    // Initial render
    this.renderCurrentUser();
    this.renderOtherUsers();
    this.renderNPCs();
    this.renderStars();

    // Spawn first star immediately
    this.spawnStar();
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

    // Touch controls for mobile
    this.setupTouchControls();
  }

  private setupTouchControls(): void {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // Only register touch if it's a primary pointer (not middle/right click)
      if (!pointer.rightButtonDown() && !pointer.middleButtonDown()) {
        this.isTouchMovement = true;
        this.touchStartPos = { x: pointer.x, y: pointer.y };
      }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.isTouchMovement) {
        const deltaX = pointer.x - this.touchStartPos.x;
        const deltaY = pointer.y - this.touchStartPos.y;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        if (distance > this.TOUCH_DEAD_ZONE) {
          // Normalize the direction
          this.touchVelocity.x = deltaX / distance;
          this.touchVelocity.y = deltaY / distance;
        } else {
          this.touchVelocity.x = 0;
          this.touchVelocity.y = 0;
        }
      }
    });

    this.input.on('pointerup', () => {
      this.isTouchMovement = false;
      this.touchVelocity.x = 0;
      this.touchVelocity.y = 0;
    });
  }

  private setupCameraControls(): void {
    // Set camera bounds to the map size
    this.cameras.main.setBounds(0, 0, MAP_WIDTH, MAP_HEIGHT);

    // Mouse wheel zoom
    this.input.on('wheel', (_pointer: Phaser.Input.Pointer, _gameObjects: any, _deltaX: number, deltaY: number) => {
      const currentZoom = this.cameras.main.zoom;
      let newZoom = currentZoom;

      if (deltaY > 0) {
        // Zoom out
        newZoom = Math.max(this.MIN_ZOOM, currentZoom - this.ZOOM_STEP);
      } else {
        // Zoom in
        newZoom = Math.min(this.MAX_ZOOM, currentZoom + this.ZOOM_STEP);
      }

      this.cameras.main.setZoom(newZoom);
    });

    // Mouse drag to pan
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // Only allow dragging with middle mouse button or right click
      if (pointer.rightButtonDown() || pointer.middleButtonDown()) {
        this.isDragging = true;
        this.dragStartX = pointer.x;
        this.dragStartY = pointer.y;
      }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.isDragging) {
        const deltaX = (pointer.x - this.dragStartX) / this.cameras.main.zoom;
        const deltaY = (pointer.y - this.dragStartY) / this.cameras.main.zoom;

        this.cameras.main.scrollX -= deltaX;
        this.cameras.main.scrollY -= deltaY;

        this.dragStartX = pointer.x;
        this.dragStartY = pointer.y;
      }
    });

    this.input.on('pointerup', () => {
      this.isDragging = false;
    });

    // Expose zoom methods globally for UI controls
    (window as any).phaserZoomIn = () => {
      const newZoom = Math.min(this.MAX_ZOOM, this.cameras.main.zoom + this.ZOOM_STEP);
      this.cameras.main.setZoom(newZoom);
    };

    (window as any).phaserZoomOut = () => {
      const newZoom = Math.max(this.MIN_ZOOM, this.cameras.main.zoom - this.ZOOM_STEP);
      this.cameras.main.setZoom(newZoom);
    };

    (window as any).phaserResetView = () => {
      this.cameras.main.setZoom(1);
      this.cameras.main.centerOn(MAP_WIDTH / 2, MAP_HEIGHT / 2);
    };
  }

  private setupStoreSubscription(): void {
    // Subscribe to store changes - not used for rendering, just to ensure scene stays in sync
    useGameStore.subscribe(() => {
      // Store changes are handled by always rendering in the update loop
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

  private renderNPCs(): void {
    const npcs = useGameStore.getState().npcs;
    const currentUser = useGameStore.getState().currentUser;

    // Remove sprites for NPCs that no longer exist
    this.npcSprites.forEach((value, npcId) => {
      const npcExists = npcs.find((npc) => npc.id === npcId);
      if (!npcExists) {
        value.sprite.destroy();
        value.text.destroy();
        value.nameText.destroy();
        this.npcSprites.delete(npcId);
      }
    });

    // Add or update sprites for NPCs
    npcs.forEach((npc: NPCConfig) => {
      const existing = this.npcSprites.get(npc.id);

      if (!existing) {
        // Create NPC sprite (robot icon)
        const graphics = this.add.graphics();

        // Robot body (rectangle)
        graphics.fillStyle(0x00d9ff, 1);
        graphics.fillRect(npc.position.x - 12, npc.position.y - 12, 24, 24);

        // Robot head
        graphics.fillStyle(0x00a8cc, 1);
        graphics.fillRect(npc.position.x - 8, npc.position.y - 18, 16, 10);

        // Eyes
        graphics.fillStyle(0xffffff, 1);
        graphics.fillCircle(npc.position.x - 4, npc.position.y - 14, 2);
        graphics.fillCircle(npc.position.x + 4, npc.position.y - 14, 2);

        // Role label
        const text = this.add.text(npc.position.x, npc.position.y + 20, npc.role, {
          fontSize: '10px',
          color: '#00d9ff',
          backgroundColor: '#000000',
          padding: { x: 4, y: 2 },
        });
        text.setOrigin(0.5, 0.5);

        // Name label
        const nameText = this.add.text(npc.position.x, npc.position.y - 28, npc.name, {
          fontSize: '12px',
          color: '#ffffff',
          backgroundColor: '#000000',
          padding: { x: 4, y: 2 },
        });
        nameText.setOrigin(0.5, 0.5);

        this.npcSprites.set(npc.id, { sprite: graphics, text, nameText });
      }

      // Check proximity to current user
      if (currentUser) {
        const distance = Phaser.Math.Distance.Between(
          currentUser.position.x,
          currentUser.position.y,
          npc.position.x,
          npc.position.y
        );

        const { nearbyNPCs, addNearbyNPC, removeNearbyNPC } = useGameStore.getState();

        if (distance <= PROXIMITY_RADIUS) {
          if (!nearbyNPCs.has(npc.id)) {
            addNearbyNPC(npc.id);
            console.log(`🤖 Near NPC: ${npc.name}`);
          }
        } else {
          if (nearbyNPCs.has(npc.id)) {
            removeNearbyNPC(npc.id);
          }
        }
      }
    });
  }

  private renderStars(): void {
    const stars = useGameStore.getState().stars;

    // Remove sprites for stars that no longer exist
    this.starSprites.forEach((sprite, starId) => {
      if (!stars.has(starId)) {
        sprite.destroy();
        this.starSprites.delete(starId);
      }
    });

    // Add or update sprites for stars
    stars.forEach((star) => {
      const existing = this.starSprites.get(star.id);

      if (!existing) {
        // Create star sprite
        const graphics = this.add.graphics();
        this.drawStar(graphics, star.position.x, star.position.y);
        this.starSprites.set(star.id, graphics);
      }
    });
  }

  private drawStar(graphics: Phaser.GameObjects.Graphics, x: number, y: number): void {
    const points = 5;
    const outerRadius = 15;
    const innerRadius = 7;

    graphics.fillStyle(0xffff00, 1); // Yellow color
    graphics.lineStyle(2, 0xffa500, 1); // Orange border

    graphics.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const angle = (Math.PI / points) * i - Math.PI / 2;
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const pointX = x + Math.cos(angle) * radius;
      const pointY = y + Math.sin(angle) * radius;

      if (i === 0) {
        graphics.moveTo(pointX, pointY);
      } else {
        graphics.lineTo(pointX, pointY);
      }
    }
    graphics.closePath();
    graphics.fillPath();
    graphics.strokePath();
  }

  private spawnStar(): void {
    // Generate random position on the map
    const x = Phaser.Math.Between(50, MAP_WIDTH - 50);
    const y = Phaser.Math.Between(50, MAP_HEIGHT - 50);

    const starId = `star-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const star = {
      id: starId,
      position: { x, y },
      createdAt: Date.now(),
    };

    useGameStore.getState().addStar(star);

    // Set timer to remove star after lifetime
    this.time.delayedCall(this.STAR_LIFETIME, () => {
      useGameStore.getState().removeStar(starId);
    });
  }

  private checkStarCollision(): void {
    const currentUser = useGameStore.getState().currentUser;
    if (!currentUser) return;

    const stars = useGameStore.getState().stars;
    const { incrementCollectedStars, setShowStarPopup, removeStar } = useGameStore.getState();

    stars.forEach((star) => {
      const distance = Phaser.Math.Distance.Between(
        currentUser.position.x,
        currentUser.position.y,
        star.position.x,
        star.position.y
      );

      // Collection radius (player radius + star size)
      const collectionRadius = 15 + 15; // player radius + star radius

      if (distance <= collectionRadius) {
        // Star collected!
        incrementCollectedStars();
        removeStar(star.id);
        setShowStarPopup(true);

        // Auto-hide popup after 2 seconds
        setTimeout(() => {
          setShowStarPopup(false);
        }, 2000);
      }
    });
  }

  update(_time: number, delta: number): void {
    // Always render on every frame
    this.renderCurrentUser();
    this.renderOtherUsers();
    this.renderNPCs();
    this.renderStars();

    // Star spawning timer
    this.starSpawnTimer += delta;
    if (this.starSpawnTimer >= this.STAR_SPAWN_INTERVAL) {
      this.spawnStar();
      this.starSpawnTimer = 0;
    }

    // Check star collision
    this.checkStarCollision();

    if (!this.currentUserSprite || !this.cursors || !this.wasd) return;

    const currentUser = useGameStore.getState().currentUser;
    if (!currentUser) return;

    // Check if NPC chat modal is open - if so, don't process movement input
    const activeNPC = useGameStore.getState().activeNPC;

    let velocityX = 0;
    let velocityY = 0;

    // Check input only if NPC chat modal is closed
    if (!activeNPC) {
      // Keyboard controls
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

      // Touch controls (mobile) - only if no keyboard input
      if (velocityX === 0 && velocityY === 0 && this.isTouchMovement) {
        velocityX = this.touchVelocity.x;
        velocityY = this.touchVelocity.y;
      }
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

    // Update position locally (create new object to trigger React re-renders)
    useGameStore.getState().setCurrentUser({
      ...currentUser,
      position: { x: newX, y: newY }
    });

    // Check NPC proximity on every frame
    this.checkNPCProximity();

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

  private checkNPCProximity(): void {
    const currentUser = useGameStore.getState().currentUser;
    const npcs = useGameStore.getState().npcs;
    if (!currentUser) return;

    npcs.forEach((npc: NPCConfig) => {
      const distance = Phaser.Math.Distance.Between(
        currentUser.position.x,
        currentUser.position.y,
        npc.position.x,
        npc.position.y
      );

      const { nearbyNPCs, addNearbyNPC, removeNearbyNPC } = useGameStore.getState();

      if (distance <= PROXIMITY_RADIUS) {
        if (!nearbyNPCs.has(npc.id)) {
          addNearbyNPC(npc.id);
          console.log(`🤖 Entered proximity of ${npc.name}`);
        }
      } else {
        if (nearbyNPCs.has(npc.id)) {
          removeNearbyNPC(npc.id);
          console.log(`🤖 Left proximity of ${npc.name}`);
        }
      }
    });
  }
}

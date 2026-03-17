import { Player, Bullet, Item, GameState, WeaponType } from './types';
import { MAP_SIZE, PLAYER_RADIUS, ITEM_RADIUS, BULLET_RADIUS, WEAPONS, INITIAL_ZONE_RADIUS, MEDKIT_HEAL_AMOUNT, ARMOR_PROTECTION, HELMET_PROTECTION, BACKPACK_CAPACITY } from './constants';

export class GameEngine {
  state: GameState;
  onUpdate: (state: GameState) => void;
  lastUpdateTime: number = 0;

  constructor(onUpdate: (state: GameState) => void) {
    this.onUpdate = onUpdate;
    this.state = this.createInitialState();
    // Immediately notify the UI of the initial state
    this.onUpdate({ ...this.state });
  }

  createInitialState(): GameState {
    const players: Player[] = [];
    
    // Add human player
    players.push({
      id: 'player',
      name: '你',
      x: Math.random() * MAP_SIZE,
      y: Math.random() * MAP_SIZE,
      rotation: 0,
      health: 100,
      maxHealth: 100,
      armor: 0,
      helmet: 0,
      backpackLevel: 0,
      maxAmmo: BACKPACK_CAPACITY[0],
      weapon: null,
      ammo: 0,
      isBot: false,
      isDead: false,
      kills: 0,
      lastShotTime: 0
    });

    // Add bots
    for (let i = 0; i < 49; i++) {
      players.push({
        id: `bot-${i}`,
        name: `玩家 ${i + 1}`,
        x: Math.random() * MAP_SIZE,
        y: Math.random() * MAP_SIZE,
        rotation: Math.random() * Math.PI * 2,
        health: 100,
        maxHealth: 100,
        armor: 0,
        helmet: 0,
        backpackLevel: 0,
        maxAmmo: BACKPACK_CAPACITY[0],
        weapon: null,
        ammo: 0,
        isBot: true,
        isDead: false,
        kills: 0,
        lastShotTime: 0,
        targetX: Math.random() * MAP_SIZE,
        targetY: Math.random() * MAP_SIZE
      });
    }

    const items: Item[] = [];
    const weaponTypes = Object.values(WeaponType);
    
    // Spawn Weapons
    for (let i = 0; i < 150; i++) {
      items.push({
        id: `weapon-${i}`,
        type: 'WEAPON',
        x: Math.random() * MAP_SIZE,
        y: Math.random() * MAP_SIZE,
        weaponType: weaponTypes[Math.floor(Math.random() * weaponTypes.length)]
      });
    }

    // Spawn Medkits
    for (let i = 0; i < 80; i++) {
      items.push({
        id: `medkit-${i}`,
        type: 'MEDKIT',
        x: Math.random() * MAP_SIZE,
        y: Math.random() * MAP_SIZE,
        amount: MEDKIT_HEAL_AMOUNT
      });
    }

    // Spawn Armor
    for (let i = 0; i < 60; i++) {
      items.push({
        id: `armor-${i}`,
        type: 'ARMOR',
        x: Math.random() * MAP_SIZE,
        y: Math.random() * MAP_SIZE,
        level: Math.floor(Math.random() * 3) + 1
      });
    }

    // Spawn Helmets
    for (let i = 0; i < 60; i++) {
      items.push({
        id: `helmet-${i}`,
        type: 'HELMET',
        x: Math.random() * MAP_SIZE,
        y: Math.random() * MAP_SIZE,
        level: Math.floor(Math.random() * 3) + 1
      });
    }

    // Spawn Backpacks
    for (let i = 0; i < 50; i++) {
      items.push({
        id: `backpack-${i}`,
        type: 'BACKPACK',
        x: Math.random() * MAP_SIZE,
        y: Math.random() * MAP_SIZE,
        level: Math.floor(Math.random() * 3) + 1
      });
    }

    return {
      players,
      bullets: [],
      items,
      zone: {
        x: MAP_SIZE / 2,
        y: MAP_SIZE / 2,
        radius: INITIAL_ZONE_RADIUS,
        targetRadius: INITIAL_ZONE_RADIUS,
        shrinkSpeed: 0.5
      },
      time: 0,
      isGameOver: false,
      isPaused: false,
      winner: null
    };
  }

  reset() {
    this.state = this.createInitialState();
    this.onUpdate({ ...this.state });
  }

  update(deltaTime: number, input: { keys: Set<string>, mouseX: number, mouseY: number, mouseDown: boolean, canvasWidth: number, canvasHeight: number }) {
    if (this.state.isGameOver || this.state.isPaused) return;

    const player = this.state.players.find(p => p.id === 'player');
    if (player && !player.isDead) {
      // Player movement
      let dx = 0;
      let dy = 0;
      if (input.keys.has('w') || input.keys.has('arrowup') || input.keys.has('keyw')) dy -= 1;
      if (input.keys.has('s') || input.keys.has('arrowdown') || input.keys.has('keys')) dy += 1;
      if (input.keys.has('a') || input.keys.has('arrowleft') || input.keys.has('keya')) dx -= 1;
      if (input.keys.has('d') || input.keys.has('arrowright') || input.keys.has('keyd')) dx += 1;

      const speed = 0.3 * deltaTime; // Frame-rate independent speed
      if (dx !== 0 || dy !== 0) {
        const length = Math.sqrt(dx * dx + dy * dy);
        player.x += (dx / length) * speed;
        player.y += (dy / length) * speed;
        player.isMoving = true;
      } else {
        player.isMoving = false;
      }

      // Animation logic
      if (player.isMoving) {
        player.animTimer = (player.animTimer || 0) + deltaTime;
        if (player.animTimer > 150) {
          player.animFrame = ((player.animFrame || 0) + 1) % 4;
          player.animTimer = 0;
        }
      } else {
        player.animFrame = 0;
        player.animTimer = 0;
      }

      // Keep in map
      player.x = Math.max(0, Math.min(MAP_SIZE, player.x));
      player.y = Math.max(0, Math.min(MAP_SIZE, player.y));

      // Player rotation (towards mouse)
      const screenCenterX = input.canvasWidth / 2;
      const screenCenterY = input.canvasHeight / 2;
      player.rotation = Math.atan2(input.mouseY - screenCenterY, input.mouseX - screenCenterX);

      // Shooting
      if (input.mouseDown && player.weapon) {
        this.shoot(player);
      }

      // Looting
      this.state.items = this.state.items.filter(item => {
        const dist = Math.sqrt((player.x - item.x) ** 2 + (player.y - item.y) ** 2);
        if (dist < PLAYER_RADIUS + ITEM_RADIUS) {
          if (item.type === 'WEAPON' && item.weaponType) {
            player.weapon = WEAPONS[item.weaponType];
            player.ammo = player.maxAmmo;
          } else if (item.type === 'MEDKIT') {
            player.health = Math.min(player.maxHealth, player.health + (item.amount || MEDKIT_HEAL_AMOUNT));
          } else if (item.type === 'ARMOR') {
            player.armor = Math.max(player.armor, (item.level || 1) * 33);
          } else if (item.type === 'HELMET') {
            player.helmet = Math.max(player.helmet, (item.level || 1) * 33);
          } else if (item.type === 'BACKPACK') {
            const newLevel = item.level || 1;
            if (newLevel > player.backpackLevel) {
              player.backpackLevel = newLevel;
              player.maxAmmo = BACKPACK_CAPACITY[newLevel];
              player.ammo = Math.min(player.maxAmmo, player.ammo + 50);
            }
          }
          return false;
        }
        return true;
      });
    }

    // Update Bots
    this.state.players.forEach(p => {
      if (!p.isBot || p.isDead) return;

      // Simple AI: Move towards target, pick new target if reached
      if (p.targetX !== undefined && p.targetY !== undefined) {
        const dx = p.targetX - p.x;
        const dy = p.targetY - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < 10) {
          p.targetX = Math.random() * MAP_SIZE;
          p.targetY = Math.random() * MAP_SIZE;
          p.isMoving = false;
        } else {
          const speed = 0.18 * deltaTime; // Frame-rate independent bot speed
          p.x += (dx / dist) * speed;
          p.y += (dy / dist) * speed;
          p.rotation = Math.atan2(dy, dx);
          p.isMoving = true;
        }
      }

      // Keep bots in map
      p.x = Math.max(0, Math.min(MAP_SIZE, p.x));
      p.y = Math.max(0, Math.min(MAP_SIZE, p.y));

      // Animation logic for bots
      if (p.isMoving) {
        p.animTimer = (p.animTimer || 0) + deltaTime;
        if (p.animTimer > 150) {
          p.animFrame = ((p.animFrame || 0) + 1) % 4;
          p.animTimer = 0;
        }
      } else {
        p.animFrame = 0;
        p.animTimer = 0;
      }

      // Bot Looting
      this.state.items = this.state.items.filter(item => {
        const dist = Math.sqrt((p.x - item.x) ** 2 + (p.y - item.y) ** 2);
        if (dist < PLAYER_RADIUS + ITEM_RADIUS) {
          if (item.type === 'WEAPON' && item.weaponType && !p.weapon) {
            p.weapon = WEAPONS[item.weaponType];
            p.ammo = p.maxAmmo;
          } else if (item.type === 'MEDKIT' && p.health < p.maxHealth * 0.7) {
            p.health = Math.min(p.maxHealth, p.health + (item.amount || MEDKIT_HEAL_AMOUNT));
          } else if (item.type === 'ARMOR') {
            p.armor = Math.max(p.armor, (item.level || 1) * 33);
          } else if (item.type === 'HELMET') {
            p.helmet = Math.max(p.helmet, (item.level || 1) * 33);
          } else if (item.type === 'BACKPACK') {
            const newLevel = item.level || 1;
            if (newLevel > p.backpackLevel) {
              p.backpackLevel = newLevel;
              p.maxAmmo = BACKPACK_CAPACITY[newLevel];
              p.ammo = Math.min(p.maxAmmo, p.ammo + 50);
            }
          }
          return false;
        }
        return true;
      });

      // Bot Shooting (target player or other bots)
      if (p.weapon) {
        let target: Player | null = null;
        let minDist = p.weapon.range;

        // Check player
        if (player && !player.isDead) {
          const dist = Math.sqrt((p.x - player.x) ** 2 + (p.y - player.y) ** 2);
          if (dist < minDist) {
            target = player;
            minDist = dist;
          }
        }

        // Check other bots
        for (const other of this.state.players) {
          if (other.id === p.id || other.isDead || !other.isBot) continue;
          const dist = Math.sqrt((p.x - other.x) ** 2 + (p.y - other.y) ** 2);
          if (dist < minDist) {
            target = other;
            minDist = dist;
          }
        }

        if (target) {
          p.rotation = Math.atan2(target.y - p.y, target.x - p.x);
          this.shoot(p);
        }
      }
    });

    // Update Bullets
    this.state.bullets = this.state.bullets.filter(b => {
      const speedMultiplier = deltaTime / 16.6; // Normalize to ~60fps
      b.x += b.vx * speedMultiplier;
      b.y += b.vy * speedMultiplier;
      b.distanceTraveled += Math.sqrt((b.vx * speedMultiplier) ** 2 + (b.vy * speedMultiplier) ** 2);

      if (b.distanceTraveled > b.range) return false;

      // Collision with players
      for (const p of this.state.players) {
        if (p.isDead || p.id === b.ownerId) continue;
        const dist = Math.sqrt((b.x - p.x) ** 2 + (b.y - p.y) ** 2);
        if (dist < PLAYER_RADIUS) {
          // Damage calculation with armor and helmet
          let finalDamage = b.damage;
          if (p.armor > 0) {
            const reduction = finalDamage * ARMOR_PROTECTION;
            finalDamage -= reduction;
            p.armor = Math.max(0, p.armor - reduction * 0.5);
          }
          if (p.helmet > 0) {
            const reduction = finalDamage * HELMET_PROTECTION;
            finalDamage -= reduction;
            p.helmet = Math.max(0, p.helmet - reduction * 0.5);
          }

          p.health -= finalDamage;
          if (p.health <= 0) {
            p.isDead = true;
            const killer = this.state.players.find(k => k.id === b.ownerId);
            if (killer) killer.kills++;
          }
          return false;
        }
      }

      return true;
    });

    // Update Zone
    if (this.state.zone.radius > this.state.zone.targetRadius) {
      this.state.zone.radius -= this.state.zone.shrinkSpeed;
    } else {
      // Set new target every minute (60000ms)
      const lastInterval = Math.floor((this.state.time - deltaTime) / 60000);
      const currentInterval = Math.floor(this.state.time / 60000);
      
      if (currentInterval > lastInterval && this.state.time > 0) {
        this.state.zone.targetRadius = Math.max(100, this.state.zone.radius * 0.6);
      }
    }

    // Zone Damage
    this.state.players.forEach(p => {
      if (p.isDead) return;
      const distToCenter = Math.sqrt((p.x - this.state.zone.x) ** 2 + (p.y - this.state.zone.y) ** 2);
      if (distToCenter > this.state.zone.radius) {
        p.health -= 0.1; // Damage per frame
        if (p.health <= 0) p.isDead = true;
      }
    });

    // Check Game Over
    const alivePlayers = this.state.players.filter(p => !p.isDead);
    if (alivePlayers.length <= 1) {
      this.state.isGameOver = true;
      this.state.winner = alivePlayers[0] || null;
    }

    this.state.time += deltaTime;
    this.onUpdate({ ...this.state });
  }

  togglePause() {
    if (this.state.isGameOver) return;
    this.state.isPaused = !this.state.isPaused;
    if (this.state.isPaused) {
      // Optional: Clear any ongoing actions if needed
    }
    this.onUpdate({ ...this.state });
  }

  shoot(player: Player) {
    if (!player.weapon) return;
    const now = Date.now();
    if (now - player.lastShotTime < player.weapon.fireRate) return;

    player.lastShotTime = now;
    
    const weapon = player.weapon;
    const count = weapon.type === WeaponType.SHOTGUN ? 8 : 1;

    for (let i = 0; i < count; i++) {
      const spread = (Math.random() - 0.5) * weapon.spread;
      const angle = player.rotation + spread;
      this.state.bullets.push({
        id: Math.random().toString(),
        ownerId: player.id,
        x: player.x + Math.cos(player.rotation) * PLAYER_RADIUS,
        y: player.y + Math.sin(player.rotation) * PLAYER_RADIUS,
        vx: Math.cos(angle) * weapon.bulletSpeed,
        vy: Math.sin(angle) * weapon.bulletSpeed,
        damage: weapon.damage,
        range: weapon.range,
        distanceTraveled: 0
      });
    }
  }
}

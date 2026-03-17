export enum WeaponType {
  PISTOL = 'PISTOL',
  RIFLE = 'RIFLE',
  SHOTGUN = 'SHOTGUN',
  SNIPER = 'SNIPER'
}

export interface Weapon {
  type: WeaponType;
  name: string;
  damage: number;
  fireRate: number; // ms between shots
  reloadTime: number;
  magazineSize: number;
  range: number;
  spread: number;
  bulletSpeed: number;
}

export interface Item {
  id: string;
  type: 'WEAPON' | 'AMMO' | 'MEDKIT' | 'ARMOR' | 'HELMET' | 'BACKPACK';
  x: number;
  y: number;
  weaponType?: WeaponType;
  amount?: number;
  level?: number;
}

export interface Player {
  id: string;
  name: string;
  x: number;
  y: number;
  rotation: number;
  health: number;
  maxHealth: number;
  armor: number;
  helmet: number;
  backpackLevel: number;
  maxAmmo: number;
  weapon: Weapon | null;
  ammo: number;
  isBot: boolean;
  isDead: boolean;
  kills: number;
  lastShotTime: number;
  targetX?: number; // For AI
  targetY?: number; // For AI
  animFrame?: number;
  animTimer?: number;
  isMoving?: boolean;
}

export interface Bullet {
  id: string;
  ownerId: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  range: number;
  distanceTraveled: number;
}

export interface GameState {
  players: Player[];
  bullets: Bullet[];
  items: Item[];
  zone: {
    x: number;
    y: number;
    radius: number;
    targetRadius: number;
    shrinkSpeed: number;
  };
  time: number;
  isGameOver: boolean;
  isPaused: boolean;
  winner: Player | null;
}

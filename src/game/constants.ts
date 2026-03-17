import { WeaponType, Weapon } from './types';

export const MAP_SIZE = 4000;
export const PLAYER_RADIUS = 20;
export const ITEM_RADIUS = 15;
export const BULLET_RADIUS = 4;

export const WEAPONS: Record<WeaponType, Weapon> = {
  [WeaponType.PISTOL]: {
    type: WeaponType.PISTOL,
    name: '手枪 (P1911)',
    damage: 20,
    fireRate: 400,
    reloadTime: 1500,
    magazineSize: 7,
    range: 600,
    spread: 0.05,
    bulletSpeed: 15
  },
  [WeaponType.RIFLE]: {
    type: WeaponType.RIFLE,
    name: '步枪 (M416)',
    damage: 30,
    fireRate: 100,
    reloadTime: 2500,
    magazineSize: 30,
    range: 1000,
    spread: 0.02,
    bulletSpeed: 20
  },
  [WeaponType.SHOTGUN]: {
    type: WeaponType.SHOTGUN,
    name: '散弹枪 (S12K)',
    damage: 15, // Per pellet
    fireRate: 800,
    reloadTime: 3000,
    magazineSize: 5,
    range: 300,
    spread: 0.2,
    bulletSpeed: 12
  },
  [WeaponType.SNIPER]: {
    type: WeaponType.SNIPER,
    name: '狙击枪 (AWM)',
    damage: 100,
    fireRate: 1500,
    reloadTime: 4000,
    magazineSize: 5,
    range: 2000,
    spread: 0.001,
    bulletSpeed: 30
  }
};

export const INITIAL_ZONE_RADIUS = 2000;
export const ZONE_SHRINK_INTERVAL = 30000; // 30 seconds
export const ZONE_DAMAGE = 2; // per second

export const MEDKIT_HEAL_AMOUNT = 40;
export const ARMOR_PROTECTION = 0.3; // 30% damage reduction
export const HELMET_PROTECTION = 0.2; // 20% damage reduction
export const BACKPACK_CAPACITY = [100, 200, 300, 500]; // Ammo capacity per level

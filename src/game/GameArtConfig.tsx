// src/game/GameArtConfig.tsx
import { ITEM_RADIUS, PLAYER_RADIUS } from './constants';

// 道具尺寸配置 - 专门放大医疗包
export const ITEM_SIZE_CONFIG = {
  DEFAULT: ITEM_RADIUS *  2 * 1.8,       // 其他道具默认大小（直径）
  MEDKIT_SCALE: 1.8,              // 医疗包放大倍数
  MEDKIT_SIZE: ITEM_RADIUS * 2 * 1.8  // 医疗包最终显示尺寸
};

// 气泡特效配置接口 - 新增：武器拾取提示气泡
export interface BubbleEffectConfig {
  size: number;           // 气泡直径
  color: string;          // 气泡颜色（支持rgba）
  pulseSpeed: number;     // 脉冲动画速度（秒）
  opacity: number;        // 基础透明度
  borderWidth: number;    // 边框宽度
  showDistance: number;   // 显示距离（玩家距离多远可见）
}

// 气泡特效配置 - 新增：为不同武器配置差异化气泡
export const BUBBLE_EFFECT_CONFIG = {
  // 默认气泡配置（非武器道具）
  DEFAULT: {
    size: 0,               // 非武器道具不显示气泡
    color: 'rgba(255,255,255,0)',
    pulseSpeed: 1,
    opacity: 0,
    borderWidth: 0,
    showDistance: 0
  },
  // 手枪气泡配置
  pistol: {
    size: 60,              // 气泡直径
    color: 'rgba(100, 180, 255, 0.6)', // 浅蓝色半透明
    pulseSpeed: 1.2,       // 脉冲周期
    opacity: 0.6,          // 基础透明度
    borderWidth: 2,        // 边框宽度
    showDistance: 500      // 500范围内可见
  },
  // 步枪气泡配置
  rifle: {
    size: 70,
    color: 'rgba(255, 150, 50, 0.7)',  // 橙色半透明
    pulseSpeed: 1.0,
    opacity: 0.7,
    borderWidth: 2,
    showDistance: 600
  },
  // 霰弹枪气泡配置
  shotgun: {
    size: 75,
    color: 'rgba(220, 80, 80, 0.7)',   // 红色半透明
    pulseSpeed: 0.9,
    opacity: 0.7,
    borderWidth: 2,
    showDistance: 550
  },
  // 狙击枪气泡配置（更显眼）
  sniper: {
    size: 80,
    color: 'rgba(180, 80, 220, 0.8)',  // 紫色半透明
    showDistance: 700,
    pulseSpeed: 0.8,
    opacity: 0.8,
    borderWidth: 3
  }
};

// -------------------------- 新增：血量警告特效配置 --------------------------
// 血量警告配置接口
export interface LowHealthEffectConfig {
  threshold: number;          // 低血量阈值（1/3即0.33）
  healthBarWarningColor: string; // 低血量时血条颜色
  screenTintColor: string;    // 血色画面滤镜颜色
  baseOpacity: number;        // 基础透明度
  pulseSpeed: number;         // 脉冲动画速度（秒）
  maxOpacity: number;         // 脉冲最大透明度
  minOpacity: number;         // 脉冲最小透明度
}

// 血量警告默认配置
export const LOW_HEALTH_EFFECT_CONFIG: LowHealthEffectConfig = {
  threshold: 1/3,             // 血量低于1/3触发警告
  healthBarWarningColor: '#e74c3c', // 血条变红（亮红色）
  screenTintColor: 'rgba(180, 0, 0, 1)', // 血色滤镜基础色
  baseOpacity: 0.2,           // 基础透明度
  pulseSpeed: 0.8,            // 脉冲动画速度（越快闪烁越频繁）
  maxOpacity: 0.3,            // 脉冲最大透明度（更明显）
  minOpacity: 0.1             // 脉冲最小透明度（基础暗度）
};

// 草地贴图的配置接口
export interface GrassConfig {
  gridSpacing: number; // 网格间距（控制grass1的密度）
  randomCount: number; // grass2的随机数量
  scale: number; // 缩放比例
}

// 草地默认配置（可自定义）
export const DEFAULT_GRASS_CONFIG: GrassConfig = {
  gridSpacing: 120, // 网格间距（越小越密）
  randomCount: 50,  // grass2随机数量
  scale: 0.28       // 缩放比例
};

// 所有贴图的URL配置
export const ASSET_URLS = {
  grass1: 'https://yixiaostudio.tos-cn-beijing.volces.com/yixiaogame/yixiao_pubg/art/grass1.png',
  grass2: 'https://yixiaostudio.tos-cn-beijing.volces.com/yixiaogame/yixiao_pubg/art/grass2.png',
  player: 'https://yixiaostudio.tos-cn-beijing.volces.com/yixiaogame/yixiao_pubg/art/player1.png',
  bot: 'https://yixiaostudio.tos-cn-beijing.volces.com/yixiaogame/yixiao_pubg/art/bot1.png',
  // 武器类
  pistol: 'https://yixiaostudio.tos-cn-beijing.volces.com/yixiaogame/yixiao_pubg/art/pistol.png',
  rifle: 'https://yixiaostudio.tos-cn-beijing.volces.com/yixiaogame/yixiao_pubg/art/rifle.png',
  shotgun: 'https://yixiaostudio.tos-cn-beijing.volces.com/yixiaogame/yixiao_pubg/art/shotgun.png',
  sniper: 'https://yixiaostudio.tos-cn-beijing.volces.com/yixiaogame/yixiao_pubg/art/sniper.png',
  // 道具类
  medkit: 'https://yixiaostudio.tos-cn-beijing.volces.com/yixiaogame/yixiao_pubg/art/medkit.png',
  // 装备类
  armor: 'https://yixiaostudio.tos-cn-beijing.volces.com/yixiaogame/yixiao_pubg/art/armor.png',
  helmet: 'https://yixiaostudio.tos-cn-beijing.volces.com/yixiaogame/yixiao_pubg/art/helmet.png',
  backpack: 'https://yixiaostudio.tos-cn-beijing.volces.com/yixiaogame/yixiao_pubg/art/backpack.png'
};

// 生成草地位置的工具函数
import { MAP_SIZE } from './constants';
import { MutableRefObject } from 'react';

export type GrassPositions = {
  grass1: { x: number; y: number }[]; // 网格分布
  grass2: { x: number; y: number }[]; // 随机分布
};

/**
 * 生成草地位置数据（网格+随机）
 * @param grassConfig 草地配置
 * @returns 草地位置数据
 */
export const generateGrassPositions = (grassConfig: GrassConfig): GrassPositions => {
  // 生成网格位置（铺满整个地图）
  const generateGridPositions = (spacing: number) => {
    const positions: { x: number; y: number }[] = [];
    const startX = -spacing;
    const startY = -spacing;
    const endX = MAP_SIZE + spacing;
    const endY = MAP_SIZE + spacing;

    for (let x = startX; x <= endX; x += spacing) {
      for (let y = startY; y <= endY; y += spacing) {
        positions.push({ x, y });
      }
    }
    return positions;
  };

  // 生成随机位置
  const generateRandomPositions = (count: number) => {
    const positions: { x: number; y: number }[] = [];
    for (let i = 0; i < count; i++) {
      const x = Math.random() * (MAP_SIZE - 200) + 100;
      const y = Math.random() * (MAP_SIZE - 200) + 100;
      positions.push({ x, y });
    }
    return positions;
  };

  return {
    grass1: generateGridPositions(grassConfig.gridSpacing),
    grass2: generateRandomPositions(grassConfig.randomCount)
  };
};

// 新增：获取指定武器的气泡配置工具函数
/**
 * 获取武器对应的气泡特效配置
 * @param weaponType 武器类型（pistol/rifle/shotgun/sniper）
 * @returns 对应的气泡配置
 */
export const getWeaponBubbleConfig = (weaponType: keyof typeof ASSET_URLS) => {
  // 如果是武器类型且有对应的气泡配置，则返回，否则返回默认配置
  if (['pistol', 'rifle', 'shotgun', 'sniper'].includes(weaponType)) {
    return BUBBLE_EFFECT_CONFIG[weaponType as keyof typeof BUBBLE_EFFECT_CONFIG];
  }
  return BUBBLE_EFFECT_CONFIG.DEFAULT;
};

// -------------------------- 新增：血量警告工具函数 --------------------------
/**
 * 判断是否处于低血量状态
 * @param currentHealth 当前血量
 * @param maxHealth 最大血量
 * @returns 是否低血量
 */
export const isLowHealth = (currentHealth: number, maxHealth: number): boolean => {
  return currentHealth / maxHealth <= LOW_HEALTH_EFFECT_CONFIG.threshold;
};

/**
 * 获取低血量特效的实时透明度（带脉冲动画）
 * @returns 实时透明度值
 */
export const getLowHealthOpacity = (): number => {
  const { pulseSpeed, minOpacity, maxOpacity } = LOW_HEALTH_EFFECT_CONFIG;
  // 计算脉冲进度（0-1之间循环）
  const progress = Math.sin(Date.now() / 1000 / pulseSpeed * Math.PI * 2);
  // 转换为 minOpacity 到 maxOpacity 之间的数值
  return minOpacity + (progress + 1) * (maxOpacity - minOpacity) / 2;
};
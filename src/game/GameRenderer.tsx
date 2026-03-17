// src/game/GameRenderer.tsx
import { MutableRefObject } from 'react';
import { GameState } from './types';
import { MAP_SIZE, PLAYER_RADIUS, BULLET_RADIUS, ITEM_RADIUS } from './constants';
import { assetLoader } from './assets';
// 新增导入气泡特效 + 低血量警告配置和工具函数
import { 
  ITEM_SIZE_CONFIG, 
  GrassConfig, 
  GrassPositions, 
  BUBBLE_EFFECT_CONFIG, 
  getWeaponBubbleConfig,
  LOW_HEALTH_EFFECT_CONFIG,
  isLowHealth,
  getLowHealthOpacity
} from './GameArtConfig';
import { Player } from './types';

/**
 * 游戏主渲染函数
 * @param canvasRef Canvas DOM引用
 * @param gameStateRef 游戏状态引用
 * @param grassPositionsRef 草地位置引用
 * @param grassConfig 草地配置
 * @param playerName 玩家名称
 */
export const renderGame = (
  canvasRef: MutableRefObject<HTMLCanvasElement | null>,
  gameStateRef: MutableRefObject<GameState | null>,
  grassPositionsRef: MutableRefObject<GrassPositions | null>,
  grassConfig: GrassConfig,
  playerName: string
) => {
  const canvas = canvasRef.current;
  const currentState = gameStateRef.current;
  if (!canvas || !currentState) return;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const player = currentState.players.find(p => p.id === 'player');
  if (!player) return;

  // 清空画布
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 相机变换（跟随玩家）
  ctx.save();
  ctx.translate(canvas.width / 2 - player.x, canvas.height / 2 - player.y);

  // 绘制草地背景（纯色底）
  ctx.fillStyle = '#1a2e1a';
  ctx.fillRect(0, 0, MAP_SIZE, MAP_SIZE);

  // 绘制草地贴图（网格+随机）
  drawGrass(ctx, grassPositionsRef, grassConfig);

  // 绘制地图边框
  drawMapBorder(ctx);

  // 绘制物品（武器、医疗包等）- 新增传递玩家位置用于距离判断
  drawItems(ctx, currentState.items, player);

  // 绘制玩家
  drawPlayers(ctx, currentState.players, playerName);

  // 绘制子弹
  drawBullets(ctx, currentState.bullets);

  // 绘制安全区
  drawZone(ctx, currentState.zone);

  // 恢复画布状态
  ctx.restore();

  // -------------------------- 新增：低血量血色画面特效 --------------------------
  if (isLowHealth(player.health, player.maxHealth)) {
    const opacity = getLowHealthOpacity(); // 获取带脉冲动画的透明度
    const tintColor = LOW_HEALTH_EFFECT_CONFIG.screenTintColor
      .replace(/rgba?\((\d+),\s*(\d+),\s*(\d+),\s*[\d.]+\)/, 
      `rgba($1, $2, $3, ${opacity})`);

    // 绘制全屏血色滤镜（覆盖整个画布）
    ctx.fillStyle = tintColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
};

// 绘制草地贴图
const drawGrass = (
  ctx: CanvasRenderingContext2D,
  grassPositionsRef: MutableRefObject<GrassPositions | null>,
  grassConfig: GrassConfig
) => {
  const grass1Img = assetLoader.get('grass1');
  const grass2Img = assetLoader.get('grass2');
  const grassPositions = grassPositionsRef.current;

  if (!grass1Img || !grass2Img || !grassPositions) return;

  // 计算缩放后的尺寸
  const grass1Width = grass1Img.width * grassConfig.scale;
  const grass1Height = grass1Img.height * grassConfig.scale;
  const grass2Width = grass2Img.width * grassConfig.scale;
  const grass2Height = grass2Img.height * grassConfig.scale;

  // 绘制网格分布的grass1
  grassPositions.grass1.forEach(pos => {
    ctx.drawImage(
      grass1Img,
      pos.x - grass1Width / 2,
      pos.y - grass1Height / 2,
      grass1Width,
      grass1Height
    );
  });

  // 绘制随机分布的grass2
  grassPositions.grass2.forEach(pos => {
    ctx.drawImage(
      grass2Img,
      pos.x - grass2Width / 2,
      pos.y - grass2Height / 2,
      grass2Width,
      grass2Height
    );
  });
};

// 绘制地图边框
const drawMapBorder = (ctx: CanvasRenderingContext2D) => {
  ctx.strokeStyle = '#ff0000';
  ctx.lineWidth = 5;
  ctx.strokeRect(0, 0, MAP_SIZE, MAP_SIZE);
};

// 新增：计算两点之间的距离
const calculateDistance = (x1: number, y1: number, x2: number, y2: number) => {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
};

// 绘制物品（武器、医疗包等）- 新增player参数用于距离判断
const drawItems = (ctx: CanvasRenderingContext2D, items: GameState['items'], player: Player) => {
  // 获取当前时间用于脉冲动画计算
  const currentTime = Date.now() / 1000;

  items.forEach(item => {
    let itemImg = null;
    let itemSize = ITEM_SIZE_CONFIG.DEFAULT;

    // 设置医疗包尺寸
    if (item.type === 'MEDKIT') {
      itemSize = ITEM_SIZE_CONFIG.MEDKIT_SIZE;
    }

    // 根据物品类型选择贴图
    if (item.type === 'WEAPON') {
      switch (item.weaponType) {
        case 'PISTOL': itemImg = assetLoader.get('pistol'); break;
        case 'RIFLE': itemImg = assetLoader.get('rifle') || assetLoader.get('weapon'); break;
        case 'SHOTGUN': itemImg = assetLoader.get('shotgun') || assetLoader.get('weapon'); break;
        case 'SNIPER': itemImg = assetLoader.get('sniper') || assetLoader.get('weapon'); break;
        default: itemImg = assetLoader.get('weapon');
      }
    } else if (item.type === 'MEDKIT') {
      itemImg = assetLoader.get('medkit');
    } else if (item.type === 'ARMOR') {
      itemImg = assetLoader.get('armor');
    } else if (item.type === 'HELMET') {
      itemImg = assetLoader.get('helmet');
    } else if (item.type === 'BACKPACK') {
      itemImg = assetLoader.get('backpack');
    }

    // -------------------------- 新增：绘制武器气泡特效 --------------------------
    if (item.type === 'WEAPON' && item.weaponType) {
      // 获取对应武器的气泡配置
      const bubbleConfig = getWeaponBubbleConfig(
        item.weaponType.toLowerCase() as 'pistol' | 'rifle' | 'shotgun' | 'sniper'
      );

      // 计算玩家与武器的距离，超出显示距离则不绘制气泡
      const distance = calculateDistance(player.x, player.y, item.x, item.y);
      if (distance <= bubbleConfig.showDistance && bubbleConfig.size > 0) {
        // 计算脉冲动画的缩放比例（0.9-1.1之间循环）
        const pulseProgress = Math.sin(currentTime / bubbleConfig.pulseSpeed * Math.PI * 2);
        const scale = 0.9 + (pulseProgress + 1) * 0.1; // 转换为0.9-1.1的范围
        const finalSize = bubbleConfig.size * scale;

        // 解析气泡颜色的RGBA值
        const colorMatch = bubbleConfig.color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
        let r = 255, g = 255, b = 255, a = bubbleConfig.opacity;
        if (colorMatch) {
          r = parseInt(colorMatch[1]);
          g = parseInt(colorMatch[2]);
          b = parseInt(colorMatch[3]);
          a = parseFloat(colorMatch[4]);
        }

        // 绘制气泡外圈（脉冲效果）
        ctx.beginPath();
        ctx.arc(item.x, item.y, finalSize / 2, 0, Math.PI * 2);
        // 创建径向渐变，让气泡更有层次感
        const gradient = ctx.createRadialGradient(
          item.x, item.y, 0,
          item.x, item.y, finalSize / 2
        );
        gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${a * 0.2})`);
        gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, ${a * 0.8})`);
        ctx.fillStyle = gradient;
        ctx.fill();

        // 绘制气泡边框
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${a})`;
        ctx.lineWidth = bubbleConfig.borderWidth;
        ctx.stroke();
      }
    }
    // -------------------------- 气泡特效绘制结束 --------------------------

    // 绘制物品贴图
    if (itemImg) {
      const offset = itemSize / 2;
      ctx.drawImage(
        itemImg,
        item.x - offset,
        item.y - offset,
        itemSize,
        itemSize
      );
    } else {
      // 备用绘制（贴图加载失败）
      switch (item.type) {
        case 'WEAPON': ctx.fillStyle = '#f1c40f'; break;
        case 'MEDKIT': ctx.fillStyle = '#2ecc71'; break;
        case 'ARMOR': ctx.fillStyle = '#3498db'; break;
        case 'HELMET': ctx.fillStyle = '#9b59b6'; break;
        case 'BACKPACK': ctx.fillStyle = '#e67e22'; break;
        default: ctx.fillStyle = '#ffffff';
      }

      const drawRadius = item.type === 'MEDKIT' ? ITEM_SIZE_CONFIG.MEDKIT_SIZE / 2 : ITEM_RADIUS;
      ctx.beginPath();
      ctx.arc(item.x, item.y, drawRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // 绘制物品等级/类型标签
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'black';
    ctx.shadowBlur = 4;

    let label = '';
    if (item.type === 'WEAPON' && item.weaponType) label = item.weaponType.substring(0, 1);
    else if (item.type === 'ARMOR') label = `A${item.level}`;
    else if (item.type === 'HELMET') label = `H${item.level}`;
    else if (item.type === 'BACKPACK') label = `B${item.level}`;

    if (label) {
      ctx.font = item.type === 'MEDKIT' ? 'bold 12px Arial' : 'bold 10px Arial';
      ctx.fillText(label, item.x, item.y + (item.type === 'MEDKIT' ? 5 : 4));
    }
    ctx.shadowBlur = 0;
  });
};

// 绘制玩家
const drawPlayers = (ctx: CanvasRenderingContext2D, players: Player[], playerName: string) => {
  players.forEach(p => {
    if (p.isDead) return;

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation + Math.PI / 2); // 纹理垂直偏移修正

    // 绘制玩家贴图
    const avatarImg = p.isBot ? assetLoader.get('bot') : assetLoader.get('player');
    if (avatarImg) {
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 10;

      const baseSize = PLAYER_RADIUS * 2;
      const charWidth = baseSize;
      const charHeight = baseSize * (4 / 3);

      ctx.drawImage(
        avatarImg,
        -charWidth / 2, -charHeight / 2,
        charWidth, charHeight
      );

      ctx.shadowBlur = 0;
    } else {
      // 备用绘制（人形椭圆）
      const ellipseWidth = PLAYER_RADIUS * 0.8;
      const ellipseHeight = PLAYER_RADIUS;

      ctx.fillStyle = p.isBot ? '#e74c3c' : '#3498db';
      ctx.beginPath();
      ctx.ellipse(0, 0, ellipseWidth, ellipseHeight, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.restore();

    // 绘制玩家名称和血条
    ctx.fillStyle = 'white';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(p.id === 'player' ? playerName || '你' : p.name, p.x, p.y - PLAYER_RADIUS - 15);

    // -------------------------- 新增：低血量血条变红逻辑 --------------------------
    ctx.fillStyle = '#333';
    ctx.fillRect(p.x - 20, p.y - PLAYER_RADIUS - 10, 40, 5);
    // 计算血量比例，判断是否低于1/3阈值
    const healthRatio = p.health / p.maxHealth;
    ctx.fillStyle = healthRatio <= LOW_HEALTH_EFFECT_CONFIG.threshold
      ? LOW_HEALTH_EFFECT_CONFIG.healthBarWarningColor // 低血量：红色
      : '#2ecc71'; // 正常血量：绿色
    ctx.fillRect(p.x - 20, p.y - PLAYER_RADIUS - 10, 40 * healthRatio, 5);
  });
};

// 绘制子弹
const drawBullets = (ctx: CanvasRenderingContext2D, bullets: GameState['bullets']) => {
  bullets.forEach(b => {
    ctx.fillStyle = '#f1c40f';
    ctx.beginPath();
    ctx.arc(b.x, b.y, BULLET_RADIUS, 0, Math.PI * 2);
    ctx.fill();
  });
};

// 绘制安全区
const drawZone = (ctx: CanvasRenderingContext2D, zone: GameState['zone']) => {
  // 安全区边框
  ctx.strokeStyle = 'rgba(52, 152, 219, 0.5)';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(zone.x, zone.y, zone.radius, 0, Math.PI * 2);
  ctx.stroke();

  // 安全区外的遮罩
  ctx.fillStyle = 'rgba(52, 152, 219, 0.1)';
  ctx.beginPath();
  ctx.rect(-5000, -5000, 14000, 14000);
  ctx.arc(zone.x, zone.y, zone.radius, 0, Math.PI * 2, true);
  ctx.fill();
};
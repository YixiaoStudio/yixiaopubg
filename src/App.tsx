/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { GameEngine } from './game/engine';
import { GameState, Player, WeaponType } from './game/types';
import { MAP_SIZE, PLAYER_RADIUS, ITEM_RADIUS, BULLET_RADIUS } from './game/constants';
import { assetLoader } from './game/assets';
import { motion, AnimatePresence } from 'motion/react';
import { Crosshair, Shield, Heart, User, Trophy, Skull, Map as MapIcon, Info, X, Pause } from 'lucide-react';
import { db, auth } from './firebase';
import { collection, addDoc, query, orderBy, limit, onSnapshot, serverTimestamp, Timestamp } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';

// 导入拆分的美术配置和渲染函数
import { DEFAULT_GRASS_CONFIG, ASSET_URLS, generateGrassPositions, GrassPositions } from './game/GameArtConfig';
import { renderGame } from './game/GameRenderer';

interface LeaderboardEntry {
  id: string;
  name: string;
  score: number;
  timestamp: Timestamp;
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const gameStateRef = useRef<GameState | null>(null);
  const [engine, setEngine] = useState<GameEngine | null>(null);
  const [isAssetsLoaded, setIsAssetsLoaded] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [playerName, setPlayerName] = useState('');
  const [showWelcome, setShowWelcome] = useState(true);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [hasSavedScore, setHasSavedScore] = useState(false);
  const [frozenStats, setFrozenStats] = useState<{
    rank: number;
    kills: number;
  } | null>(null);
  const finalStatsRef = useRef<{ rank: number; kills: number } | null>(null);

  // 草地位置引用
  const grassPositionsRef = useRef<GrassPositions | null>(null);
  // 使用拆分的默认草地配置
  const grassConfig = DEFAULT_GRASS_CONFIG;

  const player = gameState?.players.find(p => p.id === 'player');
  const aliveCount = gameState?.players.filter(p => !p.isDead).length || 0;

  const inputRef = useRef({
    keys: new Set<string>(),
    mouseX: 0,
    mouseY: 0,
    mouseDown: false,
    canvasWidth: window.innerWidth,
    canvasHeight: window.innerHeight
  });
  const [uiState, setUiState] = useState({
    mouseX: 0,
    mouseY: 0,
    canvasWidth: window.innerWidth,
    canvasHeight: window.innerHeight
  });

  // Auth and Leaderboard
  useEffect(() => {
    signInAnonymously(auth).then(() => {
      console.log("✅ 排行榜系统已就绪（匿名登录成功）");
    }).catch((error) => {
      if (error.code === 'auth/admin-restricted-operation') {
        console.warn("【排行榜提示】匿名登录未开启。请在 Firebase 控制台启用 'Anonymous' 身份验证提供商，否则无法保存排名。");
      } else {
        console.error("Auth Error:", error);
      }
    });

    const q = query(collection(db, 'leaderboard'), orderBy('score', 'asc'), limit(15));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const entries: LeaderboardEntry[] = [];
      snapshot.forEach((doc) => {
        entries.push({ id: doc.id, ...doc.data() } as LeaderboardEntry);
      });

      // If no data in DB, add mock data
      if (entries.length === 0) {
        const mockEntries: LeaderboardEntry[] = [
          { id: 'mock1', name: '吃鸡大神', score: 1, timestamp: Timestamp.now() },
          { id: 'mock2', name: '伏地魔', score: 2, timestamp: Timestamp.now() },
          { id: 'mock3', name: '快递员', score: 5, timestamp: Timestamp.now() },
        ];
        setLeaderboard(mockEntries);
      } else {
        setLeaderboard(entries);
      }
    });

    return () => unsubscribe();
  }, []);

  // Handle Game Over: Show leaderboard and Save score
  useEffect(() => {
    const isGameOver = gameState?.isGameOver || player?.isDead;

    if (isGameOver && !showWelcome && playerName && finalStatsRef.current) {
      // 1. Immediately show leaderboard
      setShowLeaderboard(true);

      // 2. Freeze stats for UI if not already frozen
      if (!frozenStats) {
        setFrozenStats({
          rank: finalStatsRef.current.rank,
          kills: finalStatsRef.current.kills
        });
      }

      // 3. Save to database (only once)
      if (!hasSavedScore) {
        setHasSavedScore(true);
        const rank = finalStatsRef.current.rank;
        console.log(`【排行榜】正在向数据库提交成绩: ${playerName} - #${rank}`);

        addDoc(collection(db, 'leaderboard'), {
          name: playerName,
          score: rank,
          timestamp: serverTimestamp()
        }).then(() => {
          console.log("【排行榜】数据库记录保存成功 ✅");
        }).catch(err => {
          console.error("【排行榜】数据库记录保存失败 ❌:", err);
        });
      }
    }
  }, [gameState?.isGameOver, player?.isDead, showWelcome, playerName, hasSavedScore, leaderboard, frozenStats]);

  // Load Assets
  useEffect(() => {
    const load = async () => {
      try {
        assetLoader.onProgress = (progress) => setLoadProgress(progress);
        
        // 增加超时时间到10秒，确保贴图加载完成
        const timeout = setTimeout(() => {
          console.warn('Asset loading timed out. Starting game with fallbacks.');
          setIsAssetsLoaded(true);
        }, 10000);

        // 使用拆分的贴图URL配置加载资源
        await assetLoader.loadImages(ASSET_URLS);

        clearTimeout(timeout);
        console.log("✅ 所有贴图加载完成：", Object.keys(assetLoader.images));
        setIsAssetsLoaded(true);
      } catch (error) {
        console.error('Error during asset loading:', error);
        setIsAssetsLoaded(true); // Proceed anyway
      }
    };
    load();
  }, []);

  // 生成草地位置（使用拆分的工具函数）
  useEffect(() => {
    if (!isAssetsLoaded) return;
    grassPositionsRef.current = generateGrassPositions(grassConfig);
  }, [isAssetsLoaded, grassConfig.gridSpacing, grassConfig.randomCount]);

  // Initialize Game
  useEffect(() => {
    if (!isAssetsLoaded || showWelcome) return;
    const newEngine = new GameEngine((state) => {
      setGameState(state);
      gameStateRef.current = state;

      // Capture final stats synchronously at the exact moment of death or win
      const player = state.players.find(p => p.id === 'player');
      if ((state.isGameOver || player?.isDead) && !finalStatsRef.current) {
        const aliveCount = state.players.filter(p => !p.isDead).length;
        const rank = player?.isDead ? (aliveCount + 1) : 1;

        console.log(`【同步捕获】游戏结束状态 - 排名: #${rank}, 击杀: ${player?.kills || 0}`);

        finalStatsRef.current = {
          rank,
          kills: player?.kills || 0
        };
      }
    });
    setEngine(newEngine);

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const code = e.code.toLowerCase();

      if (key === 'escape') {
        newEngine.togglePause();
        // Clear inputs when pausing to prevent "stuck" keys or continuous firing
        inputRef.current.keys.clear();
        inputRef.current.mouseDown = false;
        return;
      }

      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key) ||
        ['keyw', 'keya', 'keys', 'keyd'].includes(code)) {
        e.preventDefault();
      }
      inputRef.current.keys.add(key);
      inputRef.current.keys.add(code);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      inputRef.current.keys.delete(e.key.toLowerCase());
      inputRef.current.keys.delete(e.code.toLowerCase());
    };

    const handleMouseMove = (e: MouseEvent) => {
      inputRef.current.mouseX = e.clientX;
      inputRef.current.mouseY = e.clientY;
      setUiState(prev => ({ ...prev, mouseX: e.clientX, mouseY: e.clientY }));
    };

    const handleMouseDown = () => { inputRef.current.mouseDown = true; };
    const handleMouseUp = () => { inputRef.current.mouseDown = false; };
    const handleBlur = () => {
      inputRef.current.keys.clear();
      inputRef.current.mouseDown = false;
    };
    const handleVisibilityChange = () => {
      if (document.hidden) {
        inputRef.current.keys.clear();
        inputRef.current.mouseDown = false;
      }
    };
    const handleContextMenu = (e: Event) => e.preventDefault();
    const handleResize = () => {
      inputRef.current.canvasWidth = window.innerWidth;
      inputRef.current.canvasHeight = window.innerHeight;
      setUiState(prev => ({ ...prev, canvasWidth: window.innerWidth, canvasHeight: window.innerHeight }));
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('resize', handleResize);

    return () => {
      inputRef.current.keys.clear();
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('resize', handleResize);
    };
  }, [isAssetsLoaded, showWelcome]);

  // Game Loop
  useEffect(() => {
    if (!engine || showWelcome) return;

    let lastTime = performance.now();
    let requestRef: number;

    const loop = (time: number) => {
      const deltaTime = time - lastTime;
      lastTime = time;

      engine.update(deltaTime, inputRef.current);
      // 调用拆分的渲染函数
      renderGame(canvasRef, gameStateRef, grassPositionsRef, grassConfig, playerName);

      requestRef = requestAnimationFrame(loop);
    };

    requestRef = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(requestRef);
  }, [engine, showWelcome, playerName, grassConfig.scale]);

  // Reset final stats when starting new game
  if (!gameState?.isGameOver && !player?.isDead && finalStatsRef.current) {
    finalStatsRef.current = null;
  }

  const handleStartGame = () => {
    if (playerName.trim()) {
      setShowWelcome(false);
      inputRef.current.keys.clear();
      inputRef.current.mouseDown = false;
      // Focus the window to ensure keyboard events are captured
      window.focus();
    }
  };

  // ========== 以下是UI渲染部分（保留不变） ==========
  return (
    <div className="relative w-full h-screen bg-[#111] overflow-hidden font-sans text-white">
      <canvas
        ref={canvasRef}
        width={uiState.canvasWidth}
        height={uiState.canvasHeight}
        className="block"
      />

      {/* HUD */}
      <div className="absolute inset-0 pointer-events-none p-6 flex flex-col justify-between z-[150]">
        {/* Top Bar */}
        <div className="flex justify-between items-start">
          <div className="flex flex-col gap-4">
            <div className="flex gap-4">
              <div className="bg-black/60 backdrop-blur-md border border-white/10 p-3 rounded-xl flex items-center gap-3">
                <User className="w-5 h-5 text-blue-400" />
                <div>
                  <div className="text-[10px] text-white/50 uppercase tracking-wider font-bold">幸存人数</div>
                  <div className="text-xl font-mono leading-none">{aliveCount} / 50</div>
                </div>
              </div>
              <div className="bg-black/60 backdrop-blur-md border border-white/10 p-3 rounded-xl flex items-center gap-3">
                <Skull className="w-5 h-5 text-red-400" />
                <div>
                  <div className="text-[10px] text-white/50 uppercase tracking-wider font-bold">击杀数</div>
                  <div className="text-xl font-mono leading-none">{player?.kills || 0}</div>
                </div>
              </div>
              <button
                onClick={() => {
                  console.log("手动点击排行榜按钮");
                  setShowLeaderboard(!showLeaderboard);
                }}
                className="bg-black/60 backdrop-blur-md border border-white/10 p-3 rounded-xl flex items-center gap-3 pointer-events-auto hover:bg-white/10 transition-colors cursor-pointer"
              >
                <Trophy className="w-5 h-5 text-orange-400" />
                <div className="text-left">
                  <div className="text-[10px] text-white/50 uppercase tracking-wider font-bold">排行榜</div>
                  <div className="text-xs font-bold text-orange-400">点击查看</div>
                </div>
              </button>
            </div>
          </div>

          {/* Minimap */}
          <div className="bg-black/60 backdrop-blur-md border border-white/10 p-2 rounded-xl">
            <div className="relative w-40 h-40 bg-zinc-900 overflow-hidden rounded-lg">
              {gameState && (
                <>
                  {/* Zone in Minimap */}
                  <div
                    className="absolute border border-blue-500/50 bg-blue-500/10 rounded-full"
                    style={{
                      left: `${(gameState.zone.x / MAP_SIZE) * 100}%`,
                      top: `${(gameState.zone.y / MAP_SIZE) * 100}%`,
                      width: `${(gameState.zone.radius / MAP_SIZE) * 200}%`,
                      height: `${(gameState.zone.radius / MAP_SIZE) * 200}%`,
                      transform: 'translate(-50%, -50%)'
                    }}
                  />
                  {/* Player in Minimap */}
                  <div
                    className="absolute w-2 h-2 bg-blue-400 rounded-full shadow-[0_0_8px_rgba(96,165,250,0.8)]"
                    style={{
                      left: `${(player?.x || 0) / MAP_SIZE * 100}%`,
                      top: `${(player?.y || 0) / MAP_SIZE * 100}%`,
                      transform: 'translate(-50%, -50%)'
                    }}
                  />
                </>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="flex justify-center items-end gap-8">
          {/* Health & Status */}
          <div className="flex flex-col gap-3 w-96">
            <div className="flex justify-between items-end">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-red-500 fill-red-500" />
                  <span className="text-2xl font-mono">{Math.ceil(player?.health || 0)}</span>
                </div>
                {/* Gear Status */}
                <div className="flex gap-2">
                  <div className={`flex items-center gap-1 px-2 py-0.5 rounded bg-blue-500/20 border border-blue-500/30 ${player?.armor ? 'opacity-100' : 'opacity-30'}`}>
                    <Shield className="w-3 h-3 text-blue-400" />
                    <span className="text-[10px] font-mono">{Math.ceil(player?.armor || 0)}</span>
                  </div>
                  <div className={`flex items-center gap-1 px-2 py-0.5 rounded bg-purple-500/20 border border-purple-500/30 ${player?.helmet ? 'opacity-100' : 'opacity-30'}`}>
                    <User className="w-3 h-3 text-purple-400" />
                    <span className="text-[10px] font-mono">{Math.ceil(player?.helmet || 0)}</span>
                  </div>
                  <div className={`flex items-center gap-1 px-2 py-0.5 rounded bg-orange-500/20 border border-orange-500/30 ${player?.backpackLevel ? 'opacity-100' : 'opacity-30'}`}>
                    <MapIcon className="w-3 h-3 text-orange-400" />
                    <span className="text-[10px] font-mono">LV.{player?.backpackLevel || 0}</span>
                  </div>
                </div>
              </div>
              <div className="text-[10px] text-white/40 font-mono uppercase tracking-widest">
                生命值
              </div>
            </div>
            <div className="h-3 bg-black/40 rounded-full overflow-hidden border border-white/5">
              <motion.div
                className="h-full bg-gradient-to-r from-red-500 to-orange-500"
                initial={{ width: '100%' }}
                animate={{ width: `${player?.health || 0}%` }}
              />
            </div>
          </div>

          {/* Weapon Info */}
          <div className="bg-black/60 backdrop-blur-md border border-white/10 p-4 rounded-2xl flex items-center gap-6 min-w-[240px]">
            <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center">
              <Crosshair className="w-6 h-6 text-orange-400" />
            </div>
            <div className="flex-1">
              <div className="text-[10px] text-white/50 uppercase tracking-wider font-bold">当前武器</div>
              <div className="text-lg font-medium truncate">{player?.weapon?.name || '空手'}</div>
              <div className="text-sm font-mono text-orange-400">
                {player?.weapon ? `${player.ammo} / ${player.maxAmmo}` : '--'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Crosshair */}
      <div
        className="fixed pointer-events-none z-50 mix-blend-difference"
        style={{ left: uiState.mouseX, top: uiState.mouseY, transform: 'translate(-50%, -50%)' }}
      >
        <div className="w-6 h-6 border-2 border-white rounded-full flex items-center justify-center">
          <div className="w-1 h-1 bg-white rounded-full" />
        </div>
      </div>

      {/* Global Leaderboard Overlay */}
      <AnimatePresence>
        {(showLeaderboard || (gameState?.isGameOver || player?.isDead)) && !showWelcome && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className={`absolute top-6 left-6 z-[1000] bg-black/80 backdrop-blur-xl border p-5 rounded-2xl w-72 shadow-2xl transition-colors duration-500 ${(gameState?.isGameOver || player?.isDead) ? 'border-orange-500/50 ring-2 ring-orange-500/20' : 'border-white/10'
              }`}
          >
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-orange-400" />
                <span className="text-sm font-bold uppercase tracking-widest">
                  {(gameState?.isGameOver || player?.isDead) ? '最终排名' : '全球排行榜'}
                </span>
              </div>
              {!gameState?.isGameOver && !player?.isDead && (
                <button
                  onClick={() => setShowLeaderboard(false)}
                  className="p-1.5 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5 text-white/40" />
                </button>
              )}
            </div>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              {(frozenStats?.leaderboard || leaderboard).map((entry, idx) => (
                <div key={entry.id} className="flex justify-between items-center text-sm group">
                  <div className="flex items-center gap-3">
                    <span className={`font-mono w-5 ${idx < 3 ? 'text-orange-400' : 'text-white/30'}`}>
                      {idx + 1}.
                    </span>
                    <span className={`truncate max-w-[140px] ${entry.name === playerName ? 'text-blue-400 font-bold' : ''}`}>
                      {entry.name}
                    </span>
                  </div>
                  <span className="text-orange-400 font-mono bg-orange-400/10 px-2 py-0.5 rounded text-xs">
                    #{entry.score}
                  </span>
                </div>
              ))}
              {leaderboard.length === 0 && !frozenStats && (
                <div className="text-center text-white/40 text-xs py-4">正在同步排名数据...</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pause Overlay */}
      <AnimatePresence>
        {gameState?.isPaused && !gameState.isGameOver && !player?.isDead && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[250]"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="bg-zinc-900 border border-white/10 p-8 rounded-3xl text-center shadow-2xl"
            >
              <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Pause className="w-8 h-8 text-orange-500" />
              </div>
              <h2 className="text-3xl font-bold mb-2">游戏已暂停</h2>
              <p className="text-white/40 mb-6 text-sm">按 ESC 键继续游戏</p>
              <button
                onClick={() => engine?.togglePause()}
                className="bg-orange-500 text-white px-8 py-3 rounded-xl font-bold hover:bg-orange-600 transition-all active:scale-95 cursor-pointer"
              >
                继续游戏
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Welcome Popup */}
      <AnimatePresence>
        {showWelcome && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/90 backdrop-blur-xl flex items-center justify-center z-[300] p-6"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-zinc-900 border border-white/10 p-12 rounded-[32px] max-w-md w-full text-center shadow-2xl"
            >
              <div className="w-24 h-24 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl">🐔</span>
              </div>
              <h1 className="text-4xl font-bold mb-2">欢迎来到帕布鸡🐔</h1>
              <p className="text-white/60 mb-8">请输入您的大名开始游戏</p>

              <div className="mb-8">
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="您的大名是..."
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xl focus:outline-none focus:border-orange-500 transition-all text-center"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleStartGame()}
                />
              </div>

              <button
                onClick={handleStartGame}
                disabled={!playerName.trim()}
                className="w-full bg-orange-500 text-white font-bold py-4 rounded-2xl hover:bg-orange-600 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                进入战场
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game Over Screen */}
      <AnimatePresence>
        {(gameState?.isGameOver || (player?.isDead)) && !showWelcome && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-[100] p-6"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-zinc-900 border border-white/10 p-12 rounded-[32px] max-w-md w-full text-center shadow-2xl"
            >
              {gameState?.winner?.id === 'player' ? (
                <>
                  <div className="w-24 h-24 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Trophy className="w-12 h-12 text-orange-500" />
                  </div>
                  <h1 className="text-4xl font-bold mb-2">大吉大利，今晚吃鸡！</h1>
                  <p className="text-white/60 mb-8">你是最后的幸存者。</p>
                </>
              ) : (
                <>
                  <div className="w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Skull className="w-12 h-12 text-red-500" />
                  </div>
                  <h1 className="text-4xl font-bold mb-2">胜败乃兵家常事</h1>
                  <p className="text-white/60 mb-8">你被淘汰了。下次加油！</p>
                </>
              )}

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-white/5 p-4 rounded-2xl">
                  <div className="text-[10px] text-white/40 uppercase tracking-widest mb-1">击杀</div>
                  <div className="text-2xl font-mono">{finalStatsRef.current?.kills ?? player?.kills ?? 0}</div>
                </div>
                <div className="bg-white/5 p-4 rounded-2xl">
                  <div className="text-[10px] text-white/40 uppercase tracking-widest mb-1">排名</div>
                  <div className="text-2xl font-mono">#{finalStatsRef.current?.rank ?? (aliveCount + (player?.isDead ? 1 : 0))}</div>
                </div>
              </div>

              {/* Mini Leaderboard inside Game Over Screen */}
              <div className="bg-white/5 p-6 rounded-2xl mb-8 text-left">
                <div className="flex items-center gap-2 mb-4">
                  <Trophy className="w-4 h-4 text-orange-400" />
                  <span className="text-xs font-bold uppercase tracking-widest">实时排行</span>
                </div>
                <div className="space-y-2">
                  {(() => {
                    const top5 = leaderboard.slice(0, 5);
                    const playerEntryIdx = leaderboard.findIndex(e => e.name === playerName);
                    const isPlayerInTop5 = playerEntryIdx >= 0 && playerEntryIdx < 5;

                    return (
                      <>
                        {top5.map((entry, idx) => (
                          <div key={entry.id} className="flex justify-between items-center text-xs">
                            <div className="flex items-center gap-2">
                              <span className="text-white/30 font-mono w-4">{idx + 1}.</span>
                              <span className={`truncate max-w-[100px] ${entry.name === playerName ? 'text-blue-400 font-bold' : ''}`}>
                                {entry.name}
                              </span>
                            </div>
                            <span className="text-orange-400 font-mono">#{entry.score}</span>
                          </div>
                        ))}

                        {!isPlayerInTop5 && playerEntryIdx >= 5 && (
                          <>
                            <div className="text-center text-[8px] text-white/20 py-1">•••</div>
                            <div className="flex justify-between items-center text-xs bg-blue-500/10 -mx-2 px-2 py-1 rounded">
                              <div className="flex items-center gap-2">
                                <span className="text-blue-400/50 font-mono w-4">{playerEntryIdx + 1}.</span>
                                <span className="truncate max-w-[100px] text-blue-400 font-bold">
                                  {playerName}
                                </span>
                              </div>
                              <span className="text-blue-400 font-mono">#{leaderboard[playerEntryIdx].score}</span>
                            </div>
                          </>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>

              <button
                onClick={() => {
                  setHasSavedScore(false);
                  setFrozenStats(null);
                  finalStatsRef.current = null;
                  inputRef.current.keys.clear();
                  inputRef.current.mouseDown = false;
                  engine?.reset();
                }}
                className="w-full bg-white text-black font-bold py-4 rounded-2xl hover:bg-orange-500 hover:text-white transition-all active:scale-95 cursor-pointer"
              >
                重新开始
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Initial Loading Screen */}
      {(!isAssetsLoaded || !gameState) && !showWelcome && (
        <div className="absolute inset-0 bg-black flex items-center justify-center z-[200]">
          <div className="text-center w-64">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full mx-auto mb-6"
            />
            <h2 className="text-xl font-bold mb-2">正在加载资源...</h2>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mb-2">
              <motion.div
                className="h-full bg-orange-500"
                initial={{ width: 0 }}
                animate={{ width: `${loadProgress * 100}%` }}
              />
            </div>
            <p className="text-white/40 text-xs uppercase tracking-widest font-mono mb-6">
              {Math.round(loadProgress * 100)}%
            </p>
            <button
              onClick={() => setIsAssetsLoaded(true)}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] uppercase tracking-widest text-white/40 hover:text-white/60 transition-all pointer-events-auto"
            >
              跳过加载直接开始
            </button>
          </div>
        </div>
      )}

      {/* Controls Help */}
      <div className="absolute bottom-6 left-6 flex gap-4 text-white/30 text-[10px] uppercase tracking-widest font-bold">
        <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-full border border-white/5">
          <span className="text-white/60">WASD</span> 移动
        </div>
        <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-full border border-white/5">
          <span className="text-white/60">鼠标</span> 瞄准
        </div>
        <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-full border border-white/5">
          <span className="text-white/60">左键</span> 射击
        </div>
      </div>
    </div>
  );
}
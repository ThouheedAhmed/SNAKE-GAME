/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, SkipForward, SkipBack, Gamepad2, Trophy, Music, RotateCcw } from 'lucide-react';

const GRID_SIZE = 20;
const GAME_SPEED = 120; // ms per tick

type Point = { x: number; y: number };

const TRACKS = [
  { id: 1, title: 'Neon Drive (AI Gen)', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
  { id: 2, title: 'Cybernetic Dreams (AI Gen)', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3' },
  { id: 3, title: 'Digital Odyssey (AI Gen)', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3' },
];

export default function App() {
  // --- Game State ---
  const [snake, setSnake] = useState<Point[]>([{ x: Math.floor(GRID_SIZE / 2), y: Math.floor(GRID_SIZE / 2) }]);
  const [food, setFood] = useState<Point>({ x: 15, y: 5 });
  const [direction, setDirection] = useState<Point>({ x: 0, y: 0 }); // paused initially
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);

  // Use a ref for the latest direction to prevent state batching issues during rapid inputs
  const directionRef = useRef(direction);

  // --- Music State ---
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  // --- Game Logic ---
  const generateFood = useCallback((currentSnake: Point[]) => {
    let newFood: Point;
    while (true) {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
      if (!currentSnake.some(segment => segment.x === newFood.x && segment.y === newFood.y)) {
        break;
      }
    }
    setFood(newFood);
  }, []);

  const resetGame = () => {
    setSnake([{ x: Math.floor(GRID_SIZE / 2), y: Math.floor(GRID_SIZE / 2) }]);
    setDirection({ x: 0, y: -1 }); // Start moving up
    directionRef.current = { x: 0, y: -1 };
    setGameOver(false);
    setHasStarted(true);
    setScore(0);
    // Don't generate food right on the snake
    generateFood([{ x: Math.floor(GRID_SIZE / 2), y: Math.floor(GRID_SIZE / 2) }]);
  };

  const handleGameOver = useCallback(() => {
    setGameOver(true);
    setDirection({ x: 0, y: 0 });
    directionRef.current = { x: 0, y: 0 };
  }, []);

  // Keyboard listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent scrolling for game controls
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
      
      const key = e.key.toLowerCase();
      
      if (!hasStarted || gameOver) {
        if (key === ' ' || key === 'enter') {
          resetGame();
        }
        return;
      }

      const { x, y } = directionRef.current;
      
      switch (key) {
        case 'arrowup':
        case 'w':
          if (y !== 1) directionRef.current = { x: 0, y: -1 };
          break;
        case 'arrowdown':
        case 's':
          if (y !== -1) directionRef.current = { x: 0, y: 1 };
          break;
        case 'arrowleft':
        case 'a':
          if (x !== 1) directionRef.current = { x: -1, y: 0 };
          break;
        case 'arrowright':
        case 'd':
          if (x !== -1) directionRef.current = { x: 1, y: 0 };
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasStarted, gameOver, resetGame]);

  // Game Loop
  useEffect(() => {
    if (!hasStarted || gameOver || (directionRef.current.x === 0 && directionRef.current.y === 0)) return;

    const moveSnake = () => {
      setSnake(prevSnake => {
        const head = prevSnake[0];
        const newHead = {
          x: head.x + directionRef.current.x,
          y: head.y + directionRef.current.y,
        };

        // Wall collision
        if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
          handleGameOver();
          return prevSnake;
        }

        // Self collision
        if (prevSnake.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
          handleGameOver();
          return prevSnake;
        }

        const newSnake = [newHead, ...prevSnake];

        // Eat food
        if (newHead.x === food.x && newHead.y === food.y) {
          setScore(s => s + 10);
          generateFood(newSnake);
        } else {
          newSnake.pop();
        }

        return newSnake;
      });
      // Sync React state to the ref
      setDirection(directionRef.current);
    };

    const interval = setInterval(moveSnake, GAME_SPEED);
    return () => clearInterval(interval);
  }, [food, gameOver, hasStarted, generateFood, handleGameOver]);

  // High score tracker
  useEffect(() => {
    if (score > highScore) setHighScore(score);
  }, [score, highScore]);

  // --- Music Logic ---
  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;
    
    // Simple state toggle and sync with audio API
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(e => console.error("Audio playback error:", e));
    }
  }, [isPlaying]);

  const playNext = useCallback(() => {
    setCurrentTrackIndex(prev => (prev + 1) % TRACKS.length);
  }, []);

  const playPrev = useCallback(() => {
    setCurrentTrackIndex(prev => (prev - 1 + TRACKS.length) % TRACKS.length);
  }, []);

  // When track changes, play it auto if we were already playing
  useEffect(() => {
    if (audioRef.current && isPlaying) {
      audioRef.current.play()
        .catch(e => {
            console.error(e);
            setIsPlaying(false);
        });
    }
  }, [currentTrackIndex]);

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col font-mono selection:bg-cyan-500/30 overflow-hidden relative">
      {/* Background Ambience Layers */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(6,182,212,0.05),transparent_50%)] pointer-events-none" />
      <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50 shadow-[0_0_20px_#06b6d4] drop-shadow-lg" />
      <div className="absolute bottom-0 w-full h-1 bg-gradient-to-r from-transparent via-fuchsia-500 to-transparent opacity-50 shadow-[0_0_20px_#d946ef] drop-shadow-lg" />
      
      {/* Hidden Audio Element */}
      <audio 
        ref={audioRef} 
        src={TRACKS[currentTrackIndex].url}
        onEnded={playNext} 
      />

      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 w-full max-w-5xl mx-auto z-10 gap-8">
        
        {/* Header / Game Stats */}
        <div className="w-full flex justify-between items-center px-4 max-w-md">
           <div className="flex flex-col">
             <span className="text-cyan-500 text-xs tracking-wider uppercase drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]">Score</span>
             <span className="text-2xl font-bold text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]">{score.toString().padStart(4, '0')}</span>
           </div>
           
           {/* Center Logo */}
           <div className="flex flex-col items-center justify-center gap-1">
             <div className="flex gap-2 items-center text-xl font-black italic tracking-tighter">
                <span className="text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]">NEON</span>
                <span className="text-fuchsia-400 drop-shadow-[0_0_10px_rgba(232,121,249,0.8)]">SNAKE</span>
             </div>
           </div>

           <div className="flex flex-col items-end">
             <span className="text-fuchsia-500 text-xs tracking-wider uppercase drop-shadow-[0_0_8px_rgba(217,70,239,0.8)]">High</span>
             <span className="text-xl font-bold text-gray-300">{highScore.toString().padStart(4, '0')}</span>
           </div>
        </div>

        {/* Game Canvas Container */}
        <div className="relative w-full max-w-md aspect-square bg-[#0a0a0a] border border-cyan-500/30 rounded-xl overflow-hidden shadow-[0_0_40px_rgba(6,182,212,0.15)] ring-1 ring-white/5 mx-auto">
          
          {/* Subtle grid pattern background */}
          <div 
            className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)', backgroundSize: `${100/GRID_SIZE}% ${100/GRID_SIZE}%` }}
          />

          {!hasStarted && !gameOver && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
                <Gamepad2 className="w-16 h-16 text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.8)] mb-4 animate-[bounce_2s_infinite]" />
                <button 
                  onClick={resetGame}
                  className="px-6 py-3 bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 rounded hover:bg-cyan-500/30 hover:shadow-[0_0_20px_rgba(34,211,238,0.4)] transition-all uppercase tracking-widest font-bold"
                >
                  Start System
                </button>
            </div>
          )}

          {gameOver && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md border-2 border-red-500/50 shadow-[inset_0_0_50px_rgba(239,68,68,0.2)]">
                <Trophy className="w-12 h-12 text-fuchsia-400 mb-2 drop-shadow-[0_0_15px_rgba(232,121,249,0.8)]" />
                <h2 className="text-3xl font-black text-red-500 tracking-widest uppercase shadow-red-500/50 drop-shadow-md mb-1">Game Over</h2>
                <p className="text-gray-400 mb-6">Final Score: <span className="text-white">{score}</span></p>
                <button 
                  onClick={resetGame}
                  className="flex items-center gap-2 px-6 py-3 bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-400/50 rounded hover:bg-fuchsia-500/30 hover:shadow-[0_0_20px_rgba(232,121,249,0.4)] transition-all uppercase tracking-widest font-bold"
                >
                  <RotateCcw className="w-5 h-5" />
                  Restart
                </button>
            </div>
          )}

          {/* Render Snake */}
          {snake.map((segment, index) => (
            <div
              key={`${segment.x}-${segment.y}-${index}`}
              className={`absolute transition-all duration-75 rounded-[2px] ${
                index === 0 
                  ? 'bg-cyan-300 shadow-[0_0_12px_theme(colors.cyan.400)] z-10 scale-110' 
                  : 'bg-cyan-600 border border-cyan-900 shadow-[0_0_8px_rgba(8,145,178,0.4)]'
              }`}
              style={{
                left: `${(segment.x / GRID_SIZE) * 100}%`,
                top: `${(segment.y / GRID_SIZE) * 100}%`,
                width: `${100 / GRID_SIZE}%`,
                height: `${100 / GRID_SIZE}%`
              }}
            />
          ))}
          
          {/* Render Food */}
          <div
            className="absolute bg-fuchsia-500 rounded-sm shadow-[0_0_12px_theme(colors.fuchsia.500)] animate-pulse"
            style={{
              left: `${(food.x / GRID_SIZE) * 100}%`,
              top: `${(food.y / GRID_SIZE) * 100}%`,
              width: `${100 / GRID_SIZE}%`,
              height: `${100 / GRID_SIZE}%`,
              transform: 'scale(0.8)',
            }}
          />
        </div>

        {/* Music Player Panel */}
        <div className="w-full max-w-md bg-gray-900/60 backdrop-blur-md border border-white/5 rounded-2xl p-4 shadow-xl flex flex-col gap-3 z-10 relative overflow-hidden group hover:border-fuchsia-500/30 transition-colors">
            {/* Glossy top edge highlight */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            
            <div className="flex justify-between items-center px-2">
               <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded bg-fuchsia-500/20 flex items-center justify-center border border-fuchsia-500/40 shadow-[0_0_10px_rgba(217,70,239,0.2)]">
                   <Music className={`w-5 h-5 text-fuchsia-400 ${isPlaying ? 'animate-pulse' : ''}`} />
                 </div>
                 <div className="flex flex-col overflow-hidden">
                    <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Now Playing</span>
                    <span className="text-sm font-bold text-gray-100 truncate w-40">{TRACKS[currentTrackIndex].title}</span>
                 </div>
               </div>

               {/* Controls */}
               <div className="flex items-center gap-2">
                 <button onClick={playPrev} className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-full transition-colors cursor-pointer">
                   <SkipBack className="w-5 h-5" />
                 </button>
                 <button 
                  onClick={togglePlay} 
                  className="p-3 bg-fuchsia-600 text-white rounded-full hover:bg-fuchsia-500 hover:shadow-[0_0_15px_rgba(217,70,239,0.6)] hover:scale-105 transition-all focus:outline-none focus:ring-2 focus:ring-fuchsia-400 cursor-pointer"
                 >
                   {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current translate-x-[1px]" />}
                 </button>
                 <button onClick={playNext} className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-full transition-colors cursor-pointer">
                   <SkipForward className="w-5 h-5" />
                 </button>
               </div>
            </div>
            
            {/* Visualizer Bar */}
            <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden mt-1 flex relative">
               {isPlaying && (
                  <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-cyan-500 via-fuchsia-500 to-cyan-500 animate-[bg-scroll_3s_linear_infinite]" style={{ backgroundSize: '200% 100%' }} />
               )}
            </div>
        </div>
      </main>

      <style>{`
        @keyframes bg-scroll {
          0% { background-position: 0% 0%; }
          100% { background-position: 200% 0%; }
        }
      `}</style>
    </div>
  );
}

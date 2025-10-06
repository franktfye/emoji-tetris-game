import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const EMOTIONS = ['😊', '😢', '😡', '😨', '🤢', '😲', '😤'];
const EMOTION_NAMES = {
  '😊': 'Happiness',
  '😢': 'Sadness',
  '😡': 'Anger',
  '😨': 'Fear',
  '🤢': 'Disgust',
  '😲': 'Surprise',
  '😤': 'Contempt'
};
const COLS = 6;
const ROWS = 10;
const DROP_SPEED = 400;

const EmotionGame = () => {
  const [grid, setGrid] = useState([]);
  const [fallingBlock, setFallingBlock] = useState(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [multiplier, setMultiplier] = useState(1);
  const [dropSpeed, setDropSpeed] = useState(DROP_SPEED);
  const [cancelledEmotions, setCancelledEmotions] = useState({});

  // Initialize grid with 3 random rows at bottom
  const initializeGrid = useCallback(() => {
    const newGrid = Array(ROWS).fill(null).map(() => Array(COLS).fill(null));
    
    for (let row = ROWS - 3; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        newGrid[row][col] = EMOTIONS[Math.floor(Math.random() * EMOTIONS.length)];
      }
    }
    
    return newGrid;
  }, []);

  // Start game
  const startGame = () => {
    setGrid(initializeGrid());
    setScore(0);
    setGameOver(false);
    setGameStarted(true);
    setMultiplier(1);
    setDropSpeed(DROP_SPEED);
    setCancelledEmotions({});
    spawnNewBlock();
  };

  // Spawn new falling block
  const spawnNewBlock = useCallback(() => {
    const newBlock = {
      emoji: EMOTIONS[Math.floor(Math.random() * EMOTIONS.length)],
      row: 0,
      col: 2
    };
    setFallingBlock(newBlock);
  }, []);

  // Check for matches (3 in a row/column)
  const checkMatches = useCallback((currentGrid) => {
    const matches = new Set();
    
    // Check horizontal matches
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS - 2; col++) {
        const emoji = currentGrid[row][col];
        if (emoji && emoji === currentGrid[row][col + 1] && emoji === currentGrid[row][col + 2]) {
          matches.add(`${row}-${col}`);
          matches.add(`${row}-${col + 1}`);
          matches.add(`${row}-${col + 2}`);
        }
      }
    }
    
    // Check vertical matches
    for (let col = 0; col < COLS; col++) {
      for (let row = 0; row < ROWS - 2; row++) {
        const emoji = currentGrid[row][col];
        if (emoji && emoji === currentGrid[row + 1][col] && emoji === currentGrid[row + 2][col]) {
          matches.add(`${row}-${col}`);
          matches.add(`${row + 1}-${col}`);
          matches.add(`${row + 2}-${col}`);
        }
      }
    }
    
    return matches;
  }, []);

  // Remove matches and apply gravity
  const processMatches = useCallback((currentGrid) => {
    let matches = checkMatches(currentGrid);
    let hasMatches = matches.size > 0;
    let comboCount = 0;
    let currentMultiplier = 1;
    
    while (matches.size > 0) {
      comboCount++;
      currentMultiplier = Math.pow(2, comboCount - 1);
      
      // Track cancelled emotions
      const newCancelledEmotions = {};
      matches.forEach(match => {
        const [row, col] = match.split('-').map(Number);
        const emoji = currentGrid[row][col];
        if (emoji) {
          newCancelledEmotions[emoji] = (newCancelledEmotions[emoji] || 0) + 1;
        }
      });
      
      setCancelledEmotions(prev => {
        const updated = { ...prev };
        Object.keys(newCancelledEmotions).forEach(emoji => {
          updated[emoji] = (updated[emoji] || 0) + newCancelledEmotions[emoji];
        });
        return updated;
      });
      
      // Remove matched blocks
      const newGrid = currentGrid.map(row => [...row]);
      matches.forEach(match => {
        const [row, col] = match.split('-').map(Number);
        newGrid[row][col] = null;
      });
      
      // Add score
      const matchCount = Math.floor(matches.size / 3);
      setScore(prev => prev + (matchCount * 10 * currentMultiplier));
      
      // Increase speed after successful cancellation
      if (comboCount === 1) {
        setDropSpeed(prev => prev / 1.05);
      }
      
      // Apply gravity
      for (let col = 0; col < COLS; col++) {
        let writeRow = ROWS - 1;
        for (let row = ROWS - 1; row >= 0; row--) {
          if (newGrid[row][col] !== null) {
            if (row !== writeRow) {
              newGrid[writeRow][col] = newGrid[row][col];
              newGrid[row][col] = null;
            }
            writeRow--;
          }
        }
      }
      
      currentGrid = newGrid;
      matches = checkMatches(currentGrid);
    }
    
    setMultiplier(hasMatches ? currentMultiplier : 1);
    return currentGrid;
  }, [checkMatches]);

  // Move block down
  const moveDown = useCallback(() => {
    if (!fallingBlock || gameOver) return;
    
    setGrid(currentGrid => {
      const newGrid = currentGrid.map(row => [...row]);
      const newRow = fallingBlock.row + 1;
      
      // Check if can move down
      if (newRow >= ROWS || newGrid[newRow][fallingBlock.col] !== null) {
        // Place block
        newGrid[fallingBlock.row][fallingBlock.col] = fallingBlock.emoji;
        
        // Check for game over
        if (fallingBlock.row === 0) {
          setGameOver(true);
          setGameStarted(false);
          return newGrid;
        }
        
        // Process matches
        const processedGrid = processMatches(newGrid);
        
        // Spawn new block
        setTimeout(() => spawnNewBlock(), 100);
        setFallingBlock(null);
        
        return processedGrid;
      }
      
      setFallingBlock(prev => ({ ...prev, row: newRow }));
      return currentGrid;
    });
  }, [fallingBlock, gameOver, processMatches, spawnNewBlock]);

  // Move block left/right
  const moveHorizontal = useCallback((direction) => {
    if (!fallingBlock || gameOver) return;
    
    const newCol = fallingBlock.col + direction;
    
    if (newCol >= 0 && newCol < COLS && grid[fallingBlock.row][newCol] === null) {
      setFallingBlock(prev => ({ ...prev, col: newCol }));
    }
  }, [fallingBlock, grid, gameOver]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (!gameStarted || gameOver) return;
      
      switch(e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          moveHorizontal(-1);
          break;
        case 'ArrowRight':
          e.preventDefault();
          moveHorizontal(1);
          break;
        default:
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [gameStarted, gameOver, moveHorizontal]);

  // Auto drop
  useEffect(() => {
    if (!gameStarted || gameOver || !fallingBlock) return;
    
    const interval = setInterval(moveDown, dropSpeed);
    return () => clearInterval(interval);
  }, [gameStarted, gameOver, fallingBlock, moveDown, dropSpeed]);

  // Render grid
  const renderGrid = () => {
    return grid.map((row, rowIndex) => (
      <div key={rowIndex} className="flex w-full">
        {row.map((cell, colIndex) => {
          const isFalling = fallingBlock && fallingBlock.row === rowIndex && fallingBlock.col === colIndex;
          return (
            <div
              key={colIndex}
              className={`flex-1 aspect-square flex items-center justify-center text-4xl transition-all ${
                isFalling ? 'bg-yellow-100 scale-110' : 'bg-white'
              }`}
            >
              {isFalling ? fallingBlock.emoji : cell}
            </div>
          );
        })}
      </div>
    ));
  };

  // Get most cancelled emotion
  const getMostCancelledEmotion = () => {
    if (Object.keys(cancelledEmotions).length === 0) return null;
    
    let maxCount = 0;
    let mostCancelled = null;
    
    Object.entries(cancelledEmotions).forEach(([emoji, count]) => {
      if (count > maxCount) {
        maxCount = count;
        mostCancelled = emoji;
      }
    });
    
    return mostCancelled ? EMOTION_NAMES[mostCancelled] : null;
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-purple-100 to-pink-100 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        <h1 className="text-4xl font-bold text-center mb-2 text-purple-600">
          Emotion Match-3
        </h1>
        
        <div className="flex justify-between items-center mb-4">
          <div className="text-lg font-semibold">
            Score: <span className="text-purple-600">{score}</span>
          </div>
          {multiplier > 1 && (
            <div className="text-lg font-bold text-orange-500 animate-pulse">
              x{multiplier} COMBO!
            </div>
          )}
        </div>

        {!gameStarted && !gameOver && (
          <div className="text-center mb-4">
            <button
              onClick={startGame}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-8 rounded-full text-xl transition-all transform hover:scale-105"
            >
              Start Game
            </button>
            <p className="mt-4 text-sm text-gray-600">
              Match 3 emotions in a row or column!
            </p>
          </div>
        )}

        {gameOver && (
          <div className="text-center mb-4 bg-red-100 border-2 border-red-400 rounded-lg p-4">
            <h2 className="text-2xl font-bold text-red-600 mb-2">Game Over!</h2>
            <p className="text-xl mb-2">Final Score: <span className="font-bold text-purple-600">{score}</span></p>
            {getMostCancelledEmotion() && (
              <p className="text-lg mb-3 text-gray-700">
                Most Cancelled: <span className="font-bold text-indigo-600">{getMostCancelledEmotion()}</span>
              </p>
            )}
            <button
              onClick={startGame}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded-full transition-all transform hover:scale-105"
            >
              Play Again
            </button>
          </div>
        )}

        {gameStarted && (
          <>
            <div className="border-4 border-purple-300 rounded-lg overflow-hidden mb-4 bg-gray-50">
              {renderGrid()}
            </div>

            <div className="flex justify-center gap-6">
              <button
                onClick={() => moveHorizontal(-1)}
                className="bg-blue-500 hover:bg-blue-600 text-white p-6 rounded-full transition-all transform active:scale-95"
              >
                <ChevronLeft size={42} />
              </button>
              <button
                onClick={() => moveHorizontal(1)}
                className="bg-blue-500 hover:bg-blue-600 text-white p-6 rounded-full transition-all transform active:scale-95"
              >
                <ChevronRight size={42} />
              </button>
            </div>

            <p className="text-center text-sm text-gray-600 mt-4">
              Use arrow keys or buttons to control
            </p>
          </>
        )}

        <div className="mt-4 text-xs text-gray-500 text-center">
          <p>Match 3 emotions: 10 pts</p>
          <p>Combos double your score!</p>
        </div>
      </div>
    </div>
  );
};

export default EmotionGame;

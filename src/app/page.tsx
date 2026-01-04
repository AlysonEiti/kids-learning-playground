'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Gamepad2, 
  Home, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Star,
  Trophy,
  Brain,
  Music
} from 'lucide-react'

// Type definitions
type Screen = 'menu' | 'game'
type GameType = 'memory' | 'find-pair' | 'pattern' | 'different' | 'sequence' | 'simon'

interface GameState {
  type: GameType | null
  level: number
  maxLevel: number
  score: number
  attempts: number
}

// Sound effects (using Web Audio API for better performance)
const playSound = (type: 'correct' | 'wrong' | 'click' | 'win' | 'simon-green' | 'simon-red' | 'simon-yellow' | 'simon-blue') => {
  if (!soundEnabled) return
  
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
  const oscillator = audioContext.createOscillator()
  const gainNode = audioContext.createGain()
  
  oscillator.connect(gainNode)
  gainNode.connect(audioContext.destination)
  
  const sounds = {
    correct: { freq: 523.25, type: 'sine' as const },
    wrong: { freq: 261.63, type: 'sine' as const },
    click: { freq: 440, type: 'triangle' as const },
    win: { freq: 659.25, type: 'sine' as const },
    'simon-green': { freq: 329.63, type: 'sine' as const },
    'simon-red': { freq: 261.63, type: 'sine' as const },
    'simon-yellow': { freq: 392.00, type: 'sine' as const },
    'simon-blue': { freq: 440.00, type: 'sine' as const }
  }
  
  const sound = sounds[type]
  oscillator.type = sound.type
  oscillator.frequency.setValueAtTime(sound.freq, audioContext.currentTime)
  
  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)
  
  oscillator.start(audioContext.currentTime)
  oscillator.stop(audioContext.currentTime + 0.3)
}

let soundEnabled = true

// Emoji icons for games
const gameEmojis = {
  memory: ['🐶', '🐱', '🐰', '🦊', '🐼', '🦁', '🐯', '🐨', '🐸', '🐵', '🐔', '🐧', '🦄', '🐬', '🦋', '🌈'],
  fruits: ['🍎', '🍊', '🍋', '🍇', '🍓', '🍑', '🍒', '🍍'],
  colors: ['🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '⚫', '⚪']
}

// Maximum levels per game
const MAX_LEVELS = {
  memory: 5,
  'find-pair': 3,
  pattern: 5,
  different: 5,
  sequence: 4,
  simon: 10
}

// Simon game colors
const SIMON_COLORS = [
  { id: 0, color: 'green', bgClass: 'bg-green-500', activeClass: 'bg-green-300', sound: 'simon-green' as const },
  { id: 1, color: 'red', bgClass: 'bg-red-500', activeClass: 'bg-red-300', sound: 'simon-red' as const },
  { id: 2, color: 'yellow', bgClass: 'bg-yellow-400', activeClass: 'bg-yellow-200', sound: 'simon-yellow' as const },
  { id: 3, color: 'blue', bgClass: 'bg-blue-500', activeClass: 'bg-blue-300', sound: 'simon-blue' as const }
]

export default function ChildrenGames() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('menu')
  const [gameState, setGameState] = useState<GameState>({ type: null, level: 1, maxLevel: 1, score: 0, attempts: 0 })
  
  // Memory game state
  const [memoryCards, setMemoryCards] = useState<Array<{ id: number; emoji: string; flipped: boolean; matched: boolean }>>([])
  const [selectedCards, setSelectedCards] = useState<number[]>([])
  
  // Find pair game state
  const [selectedPair, setSelectedPair] = useState<{ image: string | null; word: string | null }>({ image: null, word: null })
  const [pairedItems, setPairedItems] = useState<Set<string>>(new Set())
  const [currentFindPairLevel, setCurrentFindPairLevel] = useState(1)
  
  // Pattern game state
  const [currentPatternIndex, setCurrentPatternIndex] = useState(0)
  const [patternFeedback, setPatternFeedback] = useState<string | null>(null)
  
  // Find different game state
  const [currentDifferentIndex, setCurrentDifferentIndex] = useState(0)
  const [differentFeedback, setDifferentFeedback] = useState<string | null>(null)
  
  // Sequence game state
  const [currentSequenceIndex, setCurrentSequenceIndex] = useState(0)
  const [sequenceItems, setSequenceItems] = useState<string[]>([])
  
  // Simon game state
  const [simonSequence, setSimonSequence] = useState<number[]>([])
  const [playerSequence, setPlayerSequence] = useState<number[]>([])
  const [isShowingSequence, setIsShowingSequence] = useState(false)
  const [activeSimonButton, setActiveSimonButton] = useState<number | null>(null)
  const showSequenceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // Win/Level complete state
  const [showLevelCompleteModal, setShowLevelCompleteModal] = useState(false)
  const [showWinModal, setShowWinModal] = useState(false)

  // Auto-advance to next level after showing feedback
  const autoAdvanceLevel = useCallback(() => {
    if (gameState.level < gameState.maxLevel) {
      // Show level complete feedback first
      setShowLevelCompleteModal(true)
      
      // Auto-advance after 1.5 seconds
      setTimeout(() => {
        setShowLevelCompleteModal(false)
        setGameState(prev => ({ ...prev, level: prev.level + 1 }))
        
        // Initialize next level based on game type
        switch (gameState.type) {
          case 'memory':
            initMemoryGameAtLevel(gameState.level + 1)
            break
          case 'find-pair':
            initFindPairGameAtLevel(gameState.level + 1)
            break
          case 'pattern':
            initPatternGameAtLevel(gameState.level + 1)
            break
          case 'different':
            initDifferentGameAtLevel(gameState.level + 1)
            break
          case 'sequence':
            initSequenceGameAtLevel(gameState.level + 1)
            break
          case 'simon':
            initSimonGameAtLevel(gameState.level + 1)
            break
        }
      }, 1500)
    } else {
      // All levels completed
      setShowWinModal(true)
      playSound('win')
    }
  }, [gameState.type, gameState.level, gameState.maxLevel])

  // Initialize memory game at specific level
  const initMemoryGameAtLevel = useCallback((level: number) => {
    // Progressive difficulty: Level 1 = 2x2, Level 2 = 2x3, Level 3 = 3x4, Level 4 = 4x4, Level 5 = 4x5
    const gridSizeMap = [4, 6, 12, 16, 20]
    const gridSize = gridSizeMap[level - 1]
    const emojis = gameEmojis.memory.slice(0, gridSize / 2)
    const cards = [...emojis, ...emojis]
      .map((emoji, index) => ({
        id: index,
        emoji,
        flipped: false,
        matched: false
      }))
      .sort(() => Math.random() - 0.5)
    
    setMemoryCards(cards)
    setSelectedCards([])
    setGameState(prev => ({ ...prev, level, maxLevel: MAX_LEVELS.memory }))
  }, [])

  // Handle card click in memory game
  const handleCardClick = (index: number) => {
    if (selectedCards.length === 2 || memoryCards[index].matched || memoryCards[index].flipped) return
    
    playSound('click')
    
    const newCards = [...memoryCards]
    newCards[index].flipped = true
    setMemoryCards(newCards)
    
    const newSelected = [...selectedCards, index]
    setSelectedCards(newSelected)
    
    if (newSelected.length === 2) {
      setGameState(prev => ({ ...prev, attempts: prev.attempts + 1 }))
      
      const [first, second] = newSelected
      if (newCards[first].emoji === newCards[second].emoji) {
        // Match found
        setTimeout(() => {
          const updatedCards = [...newCards]
          updatedCards[first].matched = true
          updatedCards[second].matched = true
          setMemoryCards(updatedCards)
          setSelectedCards([])
          setGameState(prev => ({ ...prev, score: prev.score + 10 }))
          playSound('correct')
          
          // Check win condition
          if (updatedCards.every(card => card.matched)) {
            playSound('win')
            autoAdvanceLevel()
          }
        }, 500)
      } else {
        // No match
        setTimeout(() => {
          const updatedCards = [...newCards]
          updatedCards[first].flipped = false
          updatedCards[second].flipped = false
          setMemoryCards(updatedCards)
          setSelectedCards([])
          playSound('wrong')
        }, 1000)
      }
    }
  }

  // Initialize find pair game at specific level
  const initFindPairGameAtLevel = useCallback((level: number) => {
    const allPairs = [
      { image: '🐶', word: 'Cachorro' },
      { image: '🐱', word: 'Gato' },
      { image: '🐰', word: 'Coelho' },
      { image: '🦊', word: 'Raposa' },
      { image: '🦁', word: 'Leão' },
      { image: '🐯', word: 'Tigre' },
      { image: '🐼', word: 'Panda' },
      { image: '🐨', word: 'Coala' },
      { image: '🐸', word: 'Sapo' },
      { image: '🦄', word: 'Unicórnio' }
    ]
    
    // Progressive difficulty: Level 1 = 3 pairs, Level 2 = 5 pairs, Level 3 = 7 pairs
    const pairsCount = [3, 5, 7][level - 1]
    const levelPairs = allPairs.slice(0, pairsCount)
    
    setSelectedPair({ image: null, word: null })
    setPairedItems(new Set())
    setCurrentFindPairLevel(level)
    setGameState(prev => ({ ...prev, level, maxLevel: MAX_LEVELS['find-pair'] }))
  }, [])

  // Handle find pair selection
  const handleFindPairSelect = (type: 'image' | 'word', value: string) => {
    playSound('click')
    
    const allPairs = [
      { image: '🐶', word: 'Cachorro' },
      { image: '🐱', word: 'Gato' },
      { image: '🐰', word: 'Coelho' },
      { image: '🦊', word: 'Raposa' },
      { image: '🦁', word: 'Leão' },
      { image: '🐯', word: 'Tigre' },
      { image: '🐼', word: 'Panda' },
      { image: '🐨', word: 'Coala' },
      { image: '🐸', word: 'Sapo' },
      { image: '🦄', word: 'Unicórnio' }
    ]
    
    const pairsCount = [3, 5, 7][currentFindPairLevel - 1]
    const levelPairs = allPairs.slice(0, pairsCount)
    
    const newSelected = { ...selectedPair, [type]: value }
    setSelectedPair(newSelected)
    
    if (newSelected.image && newSelected.word) {
      const correct = levelPairs.find(p => p.image === newSelected.image && p.word === newSelected.word)
      
      if (correct && !pairedItems.has(correct.image)) {
        setPairedItems(prev => new Set([...prev, correct.image]))
        setGameState(prev => ({ ...prev, score: prev.score + 10 }))
        playSound('correct')
        
        // Check win condition
        if (pairedItems.size === pairsCount - 1) {
          playSound('win')
          autoAdvanceLevel()
        }
      } else {
        playSound('wrong')
      }
      
      setSelectedPair({ image: null, word: null })
    }
  }

  // Initialize pattern game at specific level
  const initPatternGameAtLevel = useCallback((level: number) => {
    const allPatterns = [
      { sequence: ['🔴', '🔵', '🔴', '🔵', '🔴', '?'], answer: '🔵', options: ['🔵', '🟡', '🟢'] },
      { sequence: ['⭐', '🌙', '⭐', '🌙', '⭐', '?'], answer: '🌙', options: ['🌙', '☀️', '💫'] },
      { sequence: ['🍎', '🍎', '🍊', '🍎', '🍎', '?'], answer: '🍊', options: ['🍊', '🍋', '🍇'] },
      { sequence: ['🔺', '🔻', '🔺', '🔻', '🔺', '?'], answer: '🔻', options: ['🔻', '🔶', '⭐'] },
      { sequence: ['1', '2', '3', '4', '5', '?'], answer: '6', options: ['6', '7', '8'] },
      { sequence: ['🟢', '🟢', '🔵', '🔵', '🟢', '🟢', '?'], answer: '🔵', options: ['🔵', '🟡', '🟢'] },
      { sequence: ['A', 'B', 'C', 'D', 'E', '?'], answer: 'F', options: ['F', 'G', 'H'] },
      { sequence: ['🌸', '🌸', '🌺', '🌸', '🌸', '?'], answer: '🌺', options: ['🌺', '🌹', '🌷'] },
      { sequence: ['2', '4', '6', '8', '10', '?'], answer: '12', options: ['12', '14', '16'] },
      { sequence: ['⬆️', '⬇️', '⬆️', '⬇️', '⬆️', '?'], answer: '⬇️', options: ['⬇️', '➡️', '⬅️'] }
    ]
    
    // Progressive difficulty: More options to choose from
    const patternsForLevel = allPatterns.slice(0, level)
    
    setCurrentPatternIndex(0)
    setPatternFeedback(null)
    setGameState(prev => ({ ...prev, level, maxLevel: MAX_LEVELS.pattern }))
  }, [])

  // Handle pattern answer
  const handlePatternAnswer = (answer: string) => {
    const allPatterns = [
      { sequence: ['🔴', '🔵', '🔴', '🔵', '🔴', '?'], answer: '🔵', options: ['🔵', '🟡', '🟢'] },
      { sequence: ['⭐', '🌙', '⭐', '🌙', '⭐', '?'], answer: '🌙', options: ['🌙', '☀️', '💫'] },
      { sequence: ['🍎', '🍎', '🍊', '🍎', '🍎', '?'], answer: '🍊', options: ['🍊', '🍋', '🍇'] },
      { sequence: ['🔺', '🔻', '🔺', '🔻', '🔺', '?'], answer: '🔻', options: ['🔻', '🔶', '⭐'] },
      { sequence: ['1', '2', '3', '4', '5', '?'], answer: '6', options: ['6', '7', '8'] },
      { sequence: ['🟢', '🟢', '🔵', '🔵', '🟢', '🟢', '?'], answer: '🔵', options: ['🔵', '🟡', '🟢'] },
      { sequence: ['A', 'B', 'C', 'D', 'E', '?'], answer: 'F', options: ['F', 'G', 'H'] },
      { sequence: ['🌸', '🌸', '🌺', '🌸', '🌸', '?'], answer: '🌺', options: ['🌺', '🌹', '🌷'] },
      { sequence: ['2', '4', '6', '8', '10', '?'], answer: '12', options: ['12', '14', '16'] },
      { sequence: ['⬆️', '⬇️', '⬆️', '⬇️', '⬆️', '?'], answer: '⬇️', options: ['⬇️', '➡️', '⬅️'] }
    ]
    
    const patternsForLevel = allPatterns.slice(0, gameState.level)
    const currentPattern = patternsForLevel[currentPatternIndex]
    const correct = answer === currentPattern.answer
    
    setPatternFeedback(correct ? 'correct' : 'wrong')
    playSound(correct ? 'correct' : 'wrong')
    
    if (correct) {
      setGameState(prev => ({ ...prev, score: prev.score + 10 }))
    }
    
    setTimeout(() => {
      if (currentPatternIndex < patternsForLevel.length - 1) {
        setCurrentPatternIndex(prev => prev + 1)
        setPatternFeedback(null)
      } else {
        playSound('win')
        autoAdvanceLevel()
      }
    }, 1000)
  }

  // Initialize find different game at specific level
  const initDifferentGameAtLevel = useCallback((level: number) => {
    const allLevels = [
      { items: ['🐶', '🐶', '🐶', '🐱', '🐶'], different: 3 },
      { items: ['🔴', '🔴', '🔵', '🔴', '🔴'], different: 2 },
      { items: ['⭐', '⭐', '⭐', '⭐', '💫'], different: 4 },
      { items: ['🍎', '🍎', '🍊', '🍎', '🍎'], different: 2 },
      { items: ['🔺', '🔺', '🔺', '🔶', '🔺'], different: 3 },
      { items: ['🐶', '🐶', '🐶', '🐶', '🐱', '🐶'], different: 4 },
      { items: ['🔴', '🔴', '🔵', '🔴', '🔴', '🔴'], different: 2 },
      { items: ['⭐', '⭐', '⭐', '⭐', '⭐', '💫'], different: 5 },
      { items: ['🍎', '🍎', '🍊', '🍎', '🍎', '🍎'], different: 2 },
      { items: ['🔺', '🔺', '🔺', '🔺', '🔶', '🔺'], different: 4 }
    ]
    
    setCurrentDifferentIndex(0)
    setDifferentFeedback(null)
    setGameState(prev => ({ ...prev, level, maxLevel: MAX_LEVELS.different }))
  }, [])

  // Handle different item click
  const handleDifferentClick = (index: number) => {
    const allLevels = [
      { items: ['🐶', '🐶', '🐶', '🐱', '🐶'], different: 3 },
      { items: ['🔴', '🔴', '🔵', '🔴', '🔴'], different: 2 },
      { items: ['⭐', '⭐', '⭐', '⭐', '💫'], different: 4 },
      { items: ['🍎', '🍎', '🍊', '🍎', '🍎'], different: 2 },
      { items: ['🔺', '🔺', '🔺', '🔶', '🔺'], different: 3 },
      { items: ['🐶', '🐶', '🐶', '🐶', '🐱', '🐶'], different: 4 },
      { items: ['🔴', '🔴', '🔵', '🔴', '🔴', '🔴'], different: 2 },
      { items: ['⭐', '⭐', '⭐', '⭐', '⭐', '💫'], different: 5 },
      { items: ['🍎', '🍎', '🍊', '🍎', '🍎', '🍎'], different: 2 },
      { items: ['🔺', '🔺', '🔺', '🔺', '🔶', '🔺'], different: 4 }
    ]
    
    const levelsForGame = allLevels.slice(0, gameState.level)
    const currentLevel = levelsForGame[currentDifferentIndex]
    const correct = index === currentLevel.different
    
    setDifferentFeedback(correct ? 'correct' : 'wrong')
    playSound(correct ? 'correct' : 'wrong')
    
    if (correct) {
      setGameState(prev => ({ ...prev, score: prev.score + 10 }))
    }
    
    setTimeout(() => {
      if (currentDifferentIndex < levelsForGame.length - 1) {
        setCurrentDifferentIndex(prev => prev + 1)
        setDifferentFeedback(null)
      } else {
        playSound('win')
        autoAdvanceLevel()
      }
    }, 1000)
  }

  // Initialize sequence game at specific level
  const initSequenceGameAtLevel = useCallback((level: number) => {
    const allSequences = [
      { items: ['🌱', '🌿', '🪴', '🌳'], correctOrder: ['🌱', '🌿', '🪴', '🌳'] },
      { items: ['🥚', '🐣', '🐥', '🐔'], correctOrder: ['🥚', '🐣', '🐥', '🐔'] },
      { items: ['1', '2', '3', '4'], correctOrder: ['1', '2', '3', '4'] },
      { items: ['☁️', '🌧️', '🌈', '☀️'], correctOrder: ['☁️', '🌧️', '🌈', '☀️'] }
    ]
    
    const firstSequence = allSequences[level - 1]
    setSequenceItems([...firstSequence.items].sort(() => Math.random() - 0.5))
    setCurrentSequenceIndex(0)
    setGameState(prev => ({ ...prev, level, maxLevel: MAX_LEVELS.sequence }))
  }, [])

  // Handle sequence item click
  const handleSequenceClick = (item: string) => {
    const allSequences = [
      { items: ['🌱', '🌿', '🪴', '🌳'], correctOrder: ['🌱', '🌿', '🪴', '🌳'] },
      { items: ['🥚', '🐣', '🐥', '🐔'], correctOrder: ['🥚', '🐣', '🐥', '🐔'] },
      { items: ['1', '2', '3', '4'], correctOrder: ['1', '2', '3', '4'] },
      { items: ['☁️', '🌧️', '🌈', '☀️'], correctOrder: ['☁️', '🌧️', '🌈', '☀️'] }
    ]
    
    const currentSequence = allSequences[currentSequenceIndex]
    const correctIndex = sequenceItems.filter(i => currentSequence.correctOrder.includes(i)).length
    const correctItem = currentSequence.correctOrder[correctIndex]
    
    if (item === correctItem) {
      playSound('correct')
      setGameState(prev => ({ ...prev, score: prev.score + 10 }))
      
      const newItems = sequenceItems.filter(i => i !== item)
      setSequenceItems(newItems)
      
      if (newItems.length === 0) {
        if (currentSequenceIndex < allSequences.length - 1) {
          const nextSequence = allSequences[currentSequenceIndex + 1]
          setSequenceItems([...nextSequence.items].sort(() => Math.random() - 0.5))
          setCurrentSequenceIndex(prev => prev + 1)
        } else {
          playSound('win')
          autoAdvanceLevel()
        }
      }
    } else {
      playSound('wrong')
    }
  }

  // Initialize Simon game at specific level
  const initSimonGameAtLevel = useCallback((level: number) => {
    const newSequence = Array.from({ length: level }, () => Math.floor(Math.random() * 4))
    setSimonSequence(newSequence)
    setPlayerSequence([])
    setIsShowingSequence(true)
    setActiveSimonButton(null)
    
    // Show sequence after a short delay
    setTimeout(() => {
      showSimonSequence(newSequence)
    }, 500)
    
    setGameState(prev => ({ ...prev, level, maxLevel: MAX_LEVELS.simon }))
  }, [])

  // Show Simon sequence
  const showSimonSequence = useCallback((sequence: number[]) => {
    let index = 0
    
    const showNext = () => {
      if (index < sequence.length) {
        const buttonId = sequence[index]
        setActiveSimonButton(buttonId)
        playSound(SIMON_COLORS[buttonId].sound)
        
        setTimeout(() => {
          setActiveSimonButton(null)
          index++
          
          if (index < sequence.length) {
            showSequenceTimeoutRef.current = setTimeout(showNext, 300)
          } else {
            setIsShowingSequence(false)
          }
        }, 500)
      }
    }
    
    showSequenceTimeoutRef.current = setTimeout(showNext, 500)
  }, [])

  // Handle Simon button click
  const handleSimonClick = (buttonId: number) => {
    if (isShowingSequence) return
    
    playSound(SIMON_COLORS[buttonId].sound)
    
    const newPlayerSequence = [...playerSequence, buttonId]
    setPlayerSequence(newPlayerSequence)
    
    // Check if the input is correct so far
    const currentIndex = newPlayerSequence.length - 1
    if (newPlayerSequence[currentIndex] !== simonSequence[currentIndex]) {
      // Wrong! Show sequence again
      playSound('wrong')
      setIsShowingSequence(true)
      setPlayerSequence([])
      
      setTimeout(() => {
        showSimonSequence(simonSequence)
      }, 1000)
      return
    }
    
    // Check if the entire sequence is correct
    if (newPlayerSequence.length === simonSequence.length) {
      playSound('correct')
      setGameState(prev => ({ ...prev, score: prev.score + 10 * gameState.level }))
      
      setTimeout(() => {
        autoAdvanceLevel()
      }, 1000)
    }
  }

  // Start a game
  const startGame = (gameType: GameType) => {
    playSound('click')
    setShowWinModal(false)
    setShowLevelCompleteModal(false)
    
    // Set game type immediately to prevent empty screen
    setGameState({ type: gameType, level: 1, maxLevel: 1, score: 0, attempts: 0 })
    
    switch (gameType) {
      case 'memory':
        initMemoryGameAtLevel(1)
        break
      case 'find-pair':
        initFindPairGameAtLevel(1)
        break
      case 'pattern':
        initPatternGameAtLevel(1)
        break
      case 'different':
        initDifferentGameAtLevel(1)
        break
      case 'sequence':
        initSequenceGameAtLevel(1)
        break
      case 'simon':
        initSimonGameAtLevel(1)
        break
    }
    
    setCurrentScreen('game')
  }

  // Return to menu
  const goToMenu = () => {
    playSound('click')
    setCurrentScreen('menu')
    setGameState({ type: null, level: 1, maxLevel: 1, score: 0, attempts: 0 })
    setShowWinModal(false)
    setShowLevelCompleteModal(false)
    
    // Clear any pending timeouts
    if (showSequenceTimeoutRef.current) {
      clearTimeout(showSequenceTimeoutRef.current)
      showSequenceTimeoutRef.current = null
    }
  }

  // Restart current game
  const restartGame = () => {
    playSound('click')
    setShowWinModal(false)
    setShowLevelCompleteModal(false)
    
    if (gameState.type) {
      startGame(gameState.type)
    }
  }

  // Calculate memory game progress
  const memoryProgress = memoryCards.length > 0 
    ? (memoryCards.filter(c => c.matched).length / memoryCards.length) * 100 
    : 0

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      if (showSequenceTimeoutRef.current) {
        clearTimeout(showSequenceTimeoutRef.current)
      }
    }
  }, [])

  // MENU SCREEN
  if (currentScreen === 'menu') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-400 to-orange-300 flex flex-col">
        {/* Header */}
        <header className="p-6 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="text-6xl mb-4"
          >
            🎮
          </motion.div>
          <motion.h1
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-4xl md:text-5xl font-bold text-white mb-2 drop-shadow-lg"
            style={{ fontFamily: 'Comic Sans MS, cursive, sans-serif' }}
          >
            Jogos Divertidos
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-white text-lg drop-shadow"
          >
            Aprenda brincando! 🌟
          </motion.p>
        </header>

        {/* Games Grid */}
        <main className="flex-1 px-4 pb-8">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {/* Memory Game Card */}
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Card className="p-6 bg-white/95 backdrop-blur shadow-xl hover:shadow-2xl transition-shadow cursor-pointer">
                <div className="text-center">
                  <div className="text-5xl mb-4">🧠</div>
                  <h3 className="text-xl font-bold text-purple-600 mb-3">Jogo da Memória</h3>
                  <p className="text-gray-600 text-sm mb-2">Encontre os pares!</p>
                  <p className="text-purple-500 text-xs font-semibold mb-4">5 níveis • Dificuldade crescente</p>
                  <Button
                    onClick={() => startGame('memory')}
                    className="w-full bg-purple-500 hover:bg-purple-600 text-white text-lg py-6"
                  >
                    Jogar!
                  </Button>
                </div>
              </Card>
            </motion.div>

            {/* Find Pair Game Card */}
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Card className="p-6 bg-white/95 backdrop-blur shadow-xl hover:shadow-2xl transition-shadow cursor-pointer">
                <div className="text-center">
                  <div className="text-5xl mb-4">🎯</div>
                  <h3 className="text-xl font-bold text-blue-600 mb-3">Encontre o Par</h3>
                  <p className="text-gray-600 text-sm mb-2">Ligue imagem à palavra</p>
                  <p className="text-blue-500 text-xs font-semibold mb-4">3 níveis • Mais pares por nível</p>
                  <Button
                    onClick={() => startGame('find-pair')}
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white text-lg py-6"
                  >
                    Jogar!
                  </Button>
                </div>
              </Card>
            </motion.div>

            {/* Pattern Game Card */}
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Card className="p-6 bg-white/95 backdrop-blur shadow-xl hover:shadow-2xl transition-shadow cursor-pointer">
                <div className="text-center">
                  <div className="text-5xl mb-4">🔢</div>
                  <h3 className="text-xl font-bold text-orange-600 mb-3">Complete o Padrão</h3>
                  <p className="text-gray-600 text-sm mb-2">Qual vem depois?</p>
                  <p className="text-orange-500 text-xs font-semibold mb-4">5 níveis • Mais desafios</p>
                  <Button
                    onClick={() => startGame('pattern')}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white text-lg py-6"
                  >
                    Jogar!
                  </Button>
                </div>
              </Card>
            </motion.div>

            {/* Find Different Game Card */}
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Card className="p-6 bg-white/95 backdrop-blur shadow-xl hover:shadow-2xl transition-shadow cursor-pointer">
                <div className="text-center">
                  <div className="text-5xl mb-4">🔍</div>
                  <h3 className="text-xl font-bold text-pink-600 mb-3">Qual é o Diferente?</h3>
                  <p className="text-gray-600 text-sm mb-2">Encontre a diferença!</p>
                  <p className="text-pink-500 text-xs font-semibold mb-4">5 níveis • Mais itens</p>
                  <Button
                    onClick={() => startGame('different')}
                    className="w-full bg-pink-500 hover:bg-pink-600 text-white text-lg py-6"
                  >
                    Jogar!
                  </Button>
                </div>
              </Card>
            </motion.div>

            {/* Sequence Game Card */}
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Card className="p-6 bg-white/95 backdrop-blur shadow-xl hover:shadow-2xl transition-shadow cursor-pointer">
                <div className="text-center">
                  <div className="text-5xl mb-4">➡️</div>
                  <h3 className="text-xl font-bold text-teal-600 mb-3">Sequência Lógica</h3>
                  <p className="text-gray-600 text-sm mb-2">Ordene corretamente!</p>
                  <p className="text-teal-500 text-xs font-semibold mb-4">4 níveis • Sequências variadas</p>
                  <Button
                    onClick={() => startGame('sequence')}
                    className="w-full bg-teal-500 hover:bg-teal-600 text-white text-lg py-6"
                  >
                    Jogar!
                  </Button>
                </div>
              </Card>
            </motion.div>

            {/* Simon Game Card */}
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Card className="p-6 bg-white/95 backdrop-blur shadow-xl hover:shadow-2xl transition-shadow cursor-pointer">
                <div className="text-center">
                  <div className="text-5xl mb-4">🎵</div>
                  <h3 className="text-xl font-bold text-indigo-600 mb-3">Memória de Sequência</h3>
                  <p className="text-gray-600 text-sm mb-2">Repita a sequência!</p>
                  <p className="text-indigo-500 text-xs font-semibold mb-4">10 níveis • Sempre mais difícil</p>
                  <Button
                    onClick={() => startGame('simon')}
                    className="w-full bg-indigo-500 hover:bg-indigo-600 text-white text-lg py-6"
                  >
                    Jogar!
                  </Button>
                </div>
              </Card>
            </motion.div>
          </motion.div>
        </main>

        {/* Footer */}
        <footer className="p-4 text-center text-white/80 text-sm">
          <p>Made with ❤️ for kids aged 4-10</p>
        </footer>
      </div>
    )
  }

  // GAME SCREEN
  if (currentScreen === 'game') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-400 via-purple-400 to-pink-300 flex flex-col">
        {/* Game Header */}
        <header className="p-4 bg-white/95 shadow-lg">
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            <Button
              onClick={goToMenu}
              variant="outline"
              size="lg"
              className="gap-2"
            >
              <Home className="w-5 h-5" />
              Menu
            </Button>
            
            <div className="flex items-center gap-4">
              <Badge variant="secondary" className="text-lg px-4 py-2 gap-2">
                <Star className="w-5 h-5 text-yellow-500" />
                {gameState.score}
              </Badge>
              <Badge variant="outline" className="text-lg px-4 py-2">
                Nível {gameState.level}/{gameState.maxLevel}
              </Badge>
              {gameState.type === 'memory' && (
                <Badge variant="outline" className="text-lg px-4 py-2 gap-2">
                  <Brain className="w-5 h-5" />
                  {gameState.attempts}
                </Badge>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={restartGame}
                variant="outline"
                size="lg"
                className="gap-2"
              >
                <RotateCcw className="w-5 h-5" />
                Reiniciar
              </Button>
              <Button
                onClick={() => { soundEnabled = !soundEnabled; playSound('click') }}
                variant="outline"
                size="lg"
              >
                {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </Button>
            </div>
          </div>
        </header>

        {/* Game Content */}
        <main className="flex-1 p-4 overflow-auto">
          <div className="max-w-4xl mx-auto h-full">
            {!gameState.type && (
              <div className="flex flex-col items-center justify-center h-full">
                <div className="text-6xl mb-4">🎮</div>
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 drop-shadow-lg">
                  Carregando jogo...
                </h2>
                <p className="text-white text-lg drop-shadow">Por favor, aguarde um momento.</p>
              </div>
            )}

            {/* Memory Game */}
            {gameState.type === 'memory' && (
              <div className="flex flex-col items-center justify-center h-full">
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 drop-shadow-lg">
                  Jogo da Memória
                </h2>
                <Badge className="mb-4 text-lg px-4 py-2 bg-white/90">
                  Nível {gameState.level}/{gameState.maxLevel}
                </Badge>
                <Progress value={memoryProgress} className="w-full max-w-md mb-6 h-3" />
                
                <motion.div 
                  className={`grid gap-2 md:gap-3 ${
                    memoryCards.length <= 4 
                      ? 'grid-cols-2' 
                      : memoryCards.length <= 12
                      ? 'grid-cols-3 md:grid-cols-4' 
                      : 'grid-cols-4 md:grid-cols-5'
                  }`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  {memoryCards.map((card, index) => (
                    <motion.div
                      key={card.id}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleCardClick(index)}
                      className={`
                        aspect-square rounded-xl flex items-center justify-center text-4xl md:text-5xl cursor-pointer
                        transition-all duration-300 shadow-lg
                        ${card.matched ? 'opacity-50' : ''}
                      `}
                      style={{
                        background: card.flipped || card.matched 
                          ? 'linear-gradient(135deg, #fff 0%, #f0f0f0 100%)' 
                          : 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                        transform: card.flipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
                      }}
                    >
                      {card.flipped || card.matched ? card.emoji : '❓'}
                    </motion.div>
                  ))}
                </motion.div>
              </div>
            )}

            {/* Find Pair Game */}
            {gameState.type === 'find-pair' && (
              <div className="flex flex-col items-center justify-center h-full">
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 drop-shadow-lg">
                  Encontre o Par
                </h2>
                <Badge className="mb-4 text-lg px-4 py-2 bg-white/90">
                  Nível {gameState.level}/{gameState.maxLevel}
                </Badge>
                <p className="text-white text-lg mb-6 drop-shadow">Ligue a imagem à palavra correta!</p>
                
                <div className="w-full max-w-2xl">
                  <motion.div 
                    className="grid grid-cols-2 gap-4 mb-6"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Card className="p-4 bg-white/95">
                      <h3 className="text-lg font-bold text-center mb-3 text-purple-600">Imagens</h3>
                      <div className="grid grid-cols-3 gap-3">
                        {getFindPairsForLevel(currentFindPairLevel).map((item) => (
                          <motion.button
                            key={item.image}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleFindPairSelect('image', item.image)}
                            disabled={pairedItems.has(item.image)}
                            className={`
                              p-3 text-4xl rounded-lg transition-all
                              ${selectedPair.image === item.image 
                                ? 'bg-blue-500 text-white ring-4 ring-blue-300' 
                                : pairedItems.has(item.image)
                                ? 'bg-green-100 opacity-50'
                                : 'bg-purple-100 hover:bg-purple-200'}
                            `}
                          >
                            {item.image}
                          </motion.button>
                        ))}
                      </div>
                    </Card>
                    
                    <Card className="p-4 bg-white/95">
                      <h3 className="text-lg font-bold text-center mb-3 text-blue-600">Palavras</h3>
                      <div className="grid grid-cols-2 gap-2">
                        {getFindPairsForLevel(currentFindPairLevel).map((item) => (
                          <motion.button
                            key={item.word}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleFindPairSelect('word', item.word)}
                            disabled={pairedItems.has(item.image)}
                            className={`
                              p-2 text-sm font-bold rounded-lg transition-all
                              ${selectedPair.word === item.word 
                                ? 'bg-purple-500 text-white ring-4 ring-purple-300' 
                                : pairedItems.has(item.image)
                                ? 'bg-green-100 opacity-50'
                                : 'bg-blue-100 hover:bg-blue-200'}
                            `}
                          >
                            {item.word}
                          </motion.button>
                        ))}
                      </div>
                    </Card>
                  </motion.div>
                </div>
              </div>
            )}

            {/* Pattern Game */}
            {gameState.type === 'pattern' && (
              <div className="flex flex-col items-center justify-center h-full">
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 drop-shadow-lg">
                  Complete o Padrão
                </h2>
                <Badge className="mb-4 text-lg px-4 py-2 bg-white/90">
                  Nível {gameState.level}/{gameState.maxLevel} • Desafio {currentPatternIndex + 1}
                </Badge>
                
                {getPatternsForLevel(gameState.level, currentPatternIndex) && (
                  <>
                    <Card className="p-6 bg-white/95 mb-6 w-full max-w-lg">
                      <motion.div 
                        className="flex justify-center items-center gap-2 md:gap-3 flex-wrap"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                      >
                        {getPatternsForLevel(gameState.level, currentPatternIndex).sequence.map((item, index) => (
                          <motion.div
                            key={index}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: index * 0.1 }}
                            className={`
                              w-14 h-14 md:w-16 md:h-16 flex items-center justify-center
                              text-3xl md:text-4xl rounded-xl font-bold
                              ${item === '?' 
                                ? patternFeedback === 'correct'
                                  ? 'bg-green-500 text-white'
                                  : patternFeedback === 'wrong'
                                  ? 'bg-red-500 text-white'
                                  : 'bg-gray-200'
                                : 'bg-gradient-to-br from-yellow-300 to-orange-400'}
                            `}
                          >
                            {item}
                          </motion.div>
                        ))}
                      </motion.div>
                    </Card>
                    
                    <div className="flex gap-3">
                      {getPatternsForLevel(gameState.level, currentPatternIndex).options.map((option) => (
                        <motion.button
                          key={option}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handlePatternAnswer(option)}
                          disabled={patternFeedback !== null}
                          className="w-16 h-16 md:w-20 md:h-20 text-4xl md:text-5xl rounded-xl bg-white hover:bg-gray-100 shadow-lg transition-all"
                        >
                          {option}
                        </motion.button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Find Different Game */}
            {gameState.type === 'different' && (
              <div className="flex flex-col items-center justify-center h-full">
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 drop-shadow-lg">
                  Qual é o Diferente?
                </h2>
                <Badge className="mb-4 text-lg px-4 py-2 bg-white/90">
                  Nível {gameState.level}/{gameState.maxLevel} • Desafio {currentDifferentIndex + 1}
                </Badge>
                
                {getDifferentForLevel(gameState.level, currentDifferentIndex) && (
                  <>
                    <Card className="p-6 bg-white/95 mb-6 w-full max-w-lg">
                      <motion.div 
                        className="flex justify-center items-center gap-3 md:gap-4 flex-wrap"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                      >
                        {getDifferentForLevel(gameState.level, currentDifferentIndex).items.map((item, index) => (
                          <motion.button
                            key={index}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleDifferentClick(index)}
                            disabled={differentFeedback !== null}
                            className={`
                              w-16 h-16 md:w-20 md:h-20 flex items-center justify-center
                              text-4xl md:text-5xl rounded-xl bg-gradient-to-br from-blue-100 to-purple-100
                              shadow-lg transition-all
                              ${differentFeedback === 'correct' && index === getDifferentForLevel(gameState.level, currentDifferentIndex).different
                                ? 'ring-4 ring-green-500 bg-green-100'
                                : differentFeedback === 'wrong' && index === getDifferentForLevel(gameState.level, currentDifferentIndex).different
                                ? 'ring-4 ring-green-500 bg-green-100'
                                : differentFeedback === 'wrong'
                                ? 'opacity-50'
                                : ''}
                            `}
                          >
                            {item}
                          </motion.button>
                        ))}
                      </motion.div>
                    </Card>
                    
                    {differentFeedback && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`
                          px-6 py-3 rounded-xl text-white font-bold text-lg
                          ${differentFeedback === 'correct' ? 'bg-green-500' : 'bg-red-500'}
                        `}
                      >
                        {differentFeedback === 'correct' ? '✓ Muito bem!' : '✗ Tente novamente!'}
                      </motion.div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Sequence Game */}
            {gameState.type === 'sequence' && (
              <div className="flex flex-col items-center justify-center h-full">
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 drop-shadow-lg">
                  Sequência Lógica
                </h2>
                <Badge className="mb-4 text-lg px-4 py-2 bg-white/90">
                  Nível {gameState.level}/{gameState.maxLevel} • Sequência {currentSequenceIndex + 1}
                </Badge>
                
                {getSequenceForLevel(gameState.level, currentSequenceIndex) && (
                  <>
                    <Card className="p-6 bg-white/95 mb-6 w-full max-w-lg">
                      <div className="flex justify-center items-center gap-2 md:gap-3 flex-wrap mb-4">
                        {getSequenceForLevel(gameState.level, currentSequenceIndex).correctOrder.map((item, index) => {
                          const isPlaced = !sequenceItems.includes(item)
                          return (
                            <motion.div
                              key={item}
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ delay: index * 0.1 }}
                              className={`
                                w-14 h-14 md:w-16 md:h-16 flex items-center justify-center
                                text-3xl md:text-4xl rounded-xl font-bold border-2 border-dashed
                                ${isPlaced 
                                  ? 'bg-green-100 border-green-500' 
                                  : 'bg-gray-50 border-gray-300'}
                              `}
                            >
                              {isPlaced ? item : index + 1}
                            </motion.div>
                          )
                        })}
                      </div>
                      
                      <div className="flex justify-center items-center gap-2 md:gap-3 flex-wrap">
                        {sequenceItems.map((item) => (
                          <motion.button
                            key={item}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleSequenceClick(item)}
                            className="w-14 h-14 md:w-16 md:h-16 flex items-center justify-center text-3xl md:text-4xl rounded-xl bg-gradient-to-br from-purple-400 to-pink-400 text-white shadow-lg"
                          >
                            {item}
                          </motion.button>
                        ))}
                      </div>
                    </Card>
                    
                    <p className="text-white text-lg drop-shadow">
                      Clique na ordem correta!
                    </p>
                  </>
                )}
              </div>
            )}

            {/* Simon Game */}
            {gameState.type === 'simon' && (
              <div className="flex flex-col items-center justify-center h-full">
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 drop-shadow-lg">
                  Memória de Sequência
                </h2>
                <Badge className="mb-4 text-lg px-4 py-2 bg-white/90">
                  Nível {gameState.level}/{gameState.maxLevel}
                </Badge>
                {isShowingSequence && (
                  <p className="text-white text-lg mb-6 drop-shadow">
                    Observe a sequência... 👀
                  </p>
                )}
                {!isShowingSequence && (
                  <p className="text-white text-lg mb-6 drop-shadow">
                    Sua vez! Repita a sequência! 🎯
                  </p>
                )}
                
                {/* Simon buttons */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  {SIMON_COLORS.map((button) => (
                    <motion.button
                      key={button.id}
                      whileHover={{ scale: activeSimonButton === null ? 1.05 : 1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleSimonClick(button.id)}
                      disabled={isShowingSequence}
                      className={`
                        w-32 h-32 md:w-40 md:h-40 rounded-2xl shadow-xl transition-all duration-200
                        ${activeSimonButton === button.id ? button.activeClass : button.bgClass}
                        ${isShowingSequence ? 'cursor-not-allowed' : 'cursor-pointer'}
                      `}
                    >
                      <Music className="w-12 h-12 md:w-16 md:h-16 text-white mx-auto" />
                    </motion.button>
                  ))}
                </div>
                
                <div className="text-white text-lg drop-shadow">
                  Sequência: {playerSequence.length}/{simonSequence.length}
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Level Complete Modal */}
        <AnimatePresence>
          {showLevelCompleteModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            >
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 180 }}
                transition={{ type: 'spring', duration: 0.5 }}
                className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl"
              >
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                  className="text-8xl mb-4"
                >
                  ⭐
                </motion.div>
                <h2 className="text-3xl font-bold text-purple-600 mb-2">Muito bem!</h2>
                <p className="text-gray-600 mb-4">Nível {gameState.level} completado!</p>
                <p className="text-sm text-gray-500">Avançando para o próximo nível...</p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Win Modal */}
        <AnimatePresence>
          {showWinModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
              onClick={() => setShowWinModal(false)}
            >
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 180 }}
                transition={{ type: 'spring', duration: 0.5 }}
                className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                  className="text-8xl mb-4"
                >
                  🏆
                </motion.div>
                <h2 className="text-3xl font-bold text-purple-600 mb-2">Parabéns!</h2>
                <p className="text-gray-600 mb-4">Você completou todos os níveis!</p>
                
                <div className="bg-gradient-to-r from-yellow-100 to-orange-100 rounded-xl p-4 mb-6">
                  <p className="text-lg font-bold text-yellow-700">Pontuação Final</p>
                  <p className="text-4xl font-bold text-orange-600">{gameState.score}</p>
                  {gameState.attempts > 0 && (
                    <p className="text-sm text-gray-600 mt-2">Tentativas: {gameState.attempts}</p>
                  )}
                </div>
                
                <div className="flex gap-3">
                  <Button
                    onClick={goToMenu}
                    variant="outline"
                    size="lg"
                    className="flex-1 gap-2"
                  >
                    <Home className="w-5 h-5" />
                    Menu
                  </Button>
                  <Button
                    onClick={restartGame}
                    size="lg"
                    className="flex-1 gap-2 bg-purple-500 hover:bg-purple-600"
                  >
                    <RotateCcw className="w-5 h-5" />
                    Jogar Novamente
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <footer className="p-4 text-center text-white/80 text-sm bg-white/20">
          <p>Made with ❤️ for kids aged 4-10</p>
        </footer>
      </div>
    )
  }

  return null
}

// Helper functions for level-based data
function getFindPairsForLevel(level: number) {
  const allPairs = [
    { image: '🐶', word: 'Cachorro' },
    { image: '🐱', word: 'Gato' },
    { image: '🐰', word: 'Coelho' },
    { image: '🦊', word: 'Raposa' },
    { image: '🦁', word: 'Leão' },
    { image: '🐯', word: 'Tigre' },
    { image: '🐼', word: 'Panda' },
    { image: '🐨', word: 'Coala' },
    { image: '🐸', word: 'Sapo' },
    { image: '🦄', word: 'Unicórnio' }
  ]
  if (!level || level < 1 || level > 3) {
    console.error('Invalid level for getFindPairsForLevel:', level)
    return allPairs.slice(0, 3)
  }
  const pairsCount = [3, 5, 7][level - 1]
  return allPairs.slice(0, pairsCount)
}

function getPatternsForLevel(level: number, index: number) {
  const allPatterns = [
    { sequence: ['🔴', '🔵', '🔴', '🔵', '🔴', '?'], answer: '🔵', options: ['🔵', '🟡', '🟢'] },
    { sequence: ['⭐', '🌙', '⭐', '🌙', '⭐', '?'], answer: '🌙', options: ['🌙', '☀️', '💫'] },
    { sequence: ['🍎', '🍎', '🍊', '🍎', '🍎', '?'], answer: '🍊', options: ['🍊', '🍋', '🍇'] },
    { sequence: ['🔺', '🔻', '🔺', '🔻', '🔺', '?'], answer: '🔻', options: ['🔻', '🔶', '⭐'] },
    { sequence: ['1', '2', '3', '4', '5', '?'], answer: '6', options: ['6', '7', '8'] },
    { sequence: ['🟢', '🟢', '🔵', '🔵', '🟢', '🟢', '?'], answer: '🔵', options: ['🔵', '🟡', '🟢'] },
    { sequence: ['A', 'B', 'C', 'D', 'E', '?'], answer: 'F', options: ['F', 'G', 'H'] },
    { sequence: ['🌸', '🌸', '🌺', '🌸', '🌸', '?'], answer: '🌺', options: ['🌺', '🌹', '🌷'] },
    { sequence: ['2', '4', '6', '8', '10', '?'], answer: '12', options: ['12', '14', '16'] },
    { sequence: ['⬆️', '⬇️', '⬆️', '⬇️', '⬆️', '?'], answer: '⬇️', options: ['⬇️', '➡️', '⬅️'] }
  ]
  if (!level || level < 1 || level > 5) {
    console.error('Invalid level for getPatternsForLevel:', level)
    return allPatterns[0]
  }
  const patternsForLevel = allPatterns.slice(0, level)
  if (index < 0 || index >= patternsForLevel.length) {
    console.error('Invalid index for getPatternsForLevel:', level, index)
    return patternsForLevel[0]
  }
  return patternsForLevel[index]
}

function getDifferentForLevel(level: number, index: number) {
  const allLevels = [
    { items: ['🐶', '🐶', '🐶', '🐱', '🐶'], different: 3 },
    { items: ['🔴', '🔴', '🔵', '🔴', '🔴'], different: 2 },
    { items: ['⭐', '⭐', '⭐', '⭐', '💫'], different: 4 },
    { items: ['🍎', '🍎', '🍊', '🍎', '🍎'], different: 2 },
    { items: ['🔺', '🔺', '🔺', '🔶', '🔺'], different: 3 },
    { items: ['🐶', '🐶', '🐶', '🐶', '🐱', '🐶'], different: 4 },
    { items: ['🔴', '🔴', '🔵', '🔴', '🔴', '🔴'], different: 2 },
    { items: ['⭐', '⭐', '⭐', '⭐', '⭐', '💫'], different: 5 },
    { items: ['🍎', '🍎', '🍊', '🍎', '🍎', '🍎'], different: 2 },
    { items: ['🔺', '🔺', '🔺', '🔺', '🔶', '🔺'], different: 4 }
  ]
  if (!level || level < 1 || level > 5) {
    console.error('Invalid level for getDifferentForLevel:', level)
    return allLevels[0]
  }
  const levelsForGame = allLevels.slice(0, level)
  if (index < 0 || index >= levelsForGame.length) {
    console.error('Invalid index for getDifferentForLevel:', level, index)
    return levelsForGame[0]
  }
  return levelsForGame[index]
}

function getSequenceForLevel(level: number, index: number) {
  const allSequences = [
    { items: ['🌱', '🌿', '🪴', '🌳'], correctOrder: ['🌱', '🌿', '🪴', '🌳'] },
    { items: ['🥚', '🐣', '🐥', '🐔'], correctOrder: ['🥚', '🐣', '🐥', '🐔'] },
    { items: ['1', '2', '3', '4'], correctOrder: ['1', '2', '3', '4'] },
    { items: ['☁️', '🌧️', '🌈', '☀️'], correctOrder: ['☁️', '🌧️', '🌈', '☀️'] }
  ]
  if (!level || level < 1 || level > 4) {
    console.error('Invalid level for getSequenceForLevel:', level)
    return allSequences[0]
  }
  const sequence = allSequences[level - 1]
  if (!sequence) {
    console.error('No sequence found for level:', level)
    return allSequences[0]
  }
  return sequence
}

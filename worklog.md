---
Task ID: 3
Agent: Main Agent
Task: Fix bug - empty screen when opening a game

Work Log:
- Diagnosed the issue: `gameState.type` was not being set before the screen changed to 'game', causing the game content area to be empty
- Added error handling to helper functions (`getFindPairsForLevel`, `getPatternsForLevel`, `getDifferentForLevel`, `getSequenceForLevel`) to return valid defaults instead of undefined
- Added console.error logging for debugging when invalid parameters are passed to helper functions
- Added fallback message in game screen to show "Carregando jogo..." when `gameState.type` is not set (for debugging)
- Modified `startGame()` function to set `gameState.type` immediately before calling initialization functions, ensuring the game type is available when the screen changes
- Updated all initialization functions to preserve the existing score when updating the state (removed `score: prev.score, attempts: 0` to avoid redundant state updates)
- Removed redundant `attempts: 0` reset in initialization functions since `startGame` already initializes attempts to 0

Stage Summary:
- ✅ Bug identified: `gameState.type` not set before screen change
- ✅ Fix implemented: Set game type immediately in `startGame`
- ✅ Error handling added: Helper functions return safe defaults
- ✅ Debugging aids: Fallback message and console logging
- ✅ State management improved: Preserve score during level transitions
- ✅ Code compiled successfully
- ✅ No lint errors in modified code
- ✅ System not rewritten - only targeted fixes applied
- ✅ Automatic level progression still working
- ✅ All games should now load correctly

Expected result:
- Clicking on any game in the menu will immediately set the game type
- Game screen will render with the appropriate game content
- No empty screens will be displayed
- Console errors will help identify any remaining issues

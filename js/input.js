import { state } from './state.js';
import { handleAction } from './game.js'; // Import directly from game logic

export function setupInputs() {
    window.addEventListener('keydown', (e) => {
        if (e.code === 'Space') {
            state.keys[e.code] = true;
            
            // Instant action trigger for dialogue advancement
            if (state.gameState === "WAITING" || 
                (state.gameState === "PLAYING" && state.canInteract) || 
                state.gameState === "DIALOGUE") {
                handleAction();
            }
        } else {
            state.keys[e.code] = true;
        }
    });

    window.addEventListener('keyup', (e) => state.keys[e.code] = false);

    document.addEventListener('touchstart', (e) => {
        if(e.target.tagName === 'BUTTON') return;
        
        state.isMobile = true;
        state.touchState.isTouching = true;
        state.touchState.x = e.touches[0].clientX;
        state.touchState.y = e.touches[0].clientY;
        
        if (state.gameState === "WAITING") {
            handleAction();
        }
    }, {passive: false});
    
    document.addEventListener('touchmove', (e) => {
        if(state.gameState === "PLAYING") {
            e.preventDefault();
            state.touchState.x = e.touches[0].clientX;
            state.touchState.y = e.touches[0].clientY;
        }
    }, {passive: false});

    document.addEventListener('touchend', (e) => {
        state.touchState.isTouching = false;
        
        if (state.gameState === "DIALOGUE") {
            handleAction(); // Tap to advance
        }
    }, {passive: false});
}
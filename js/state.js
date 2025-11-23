import * as THREE from 'three';

// Mutable state object
export const state = {
    gameState: "WAITING", // WAITING, PLAYING, DIALOGUE
    
    // Physics / Position trackers
    playerVerticalSpeed: 0,
    playerHeight: 0,
    isGrounded: false,

    // RPG Elements
    activeNPC: null,
    dialogueIndex: 0,
    canInteract: false,

    // Entities Arrays
    scenery: [],
    npcs: [],

    // Inputs
    keys: {},
    touchState: { x: 0, y: 0, isTouching: false },
    isMobile: false
};

export function resetInputs() {
    state.keys['KeyW'] = false;
    state.keys['KeyA'] = false;
    state.keys['KeyS'] = false;
    state.keys['KeyD'] = false;
    state.keys['ArrowUp'] = false;
    state.keys['ArrowDown'] = false;
    state.keys['ArrowLeft'] = false;
    state.keys['ArrowRight'] = false;
    state.keys['Space'] = false;
}

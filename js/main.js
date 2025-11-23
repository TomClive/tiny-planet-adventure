import { state } from './state.js';
import { handleResize, renderer } from './graphics.js';
import { setupInputs } from './input.js';
import { startGameLoop, handleAction } from './game.js';

// Setup DOM Events
document.getElementById('btn-play').addEventListener('click', handleAction);

window.addEventListener('resize', handleResize);

// Initialize Inputs
setupInputs();

// Initialize Render Loop
document.body.appendChild(renderer.domElement);
startGameLoop();

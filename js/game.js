import * as THREE from 'three';
import { CFG } from './config.js';
import { state, resetInputs } from './state.js';
import { scene, camera, renderer, dirLight } from './graphics.js';
import { playerWrapper, playerMesh, planet, buildWorld, upVector } from './entities.js';

const clock = new THREE.Clock();
const tempQuat = new THREE.Quaternion();
const gravityRaycaster = new THREE.Raycaster();

export function startGameLoop() {
    buildWorld();
    state.gameState = "WAITING";

    // Initial camera position for title screen
    camera.position.set(0, CFG.planetRadius + 60, 60);
    camera.lookAt(0, 0, 0);

    function animate() {
        requestAnimationFrame(animate);
        const dt = Math.min(clock.getDelta(), 0.1);

        // --- TITLE SCREEN ANIMATION ---
        if(state.gameState === "WAITING") {
            const time = Date.now() * 0.0001;
            const radius = CFG.planetRadius + 40;
            camera.position.x = Math.sin(time) * radius;
            camera.position.z = Math.cos(time) * radius;
            camera.position.y = 0;
            camera.lookAt(0, 0, 0);
            renderer.render(scene, camera);
            return;
        }

        // --- GAMEPLAY ---
        
        // 1. INPUT HANDLING
        let turn = 0;
        let moveSpeed = 0;
        let jump = false;

        // Dialogue Mode - Input advances text
        if (state.gameState === "DIALOGUE") {
            // Freeze physics in dialogue
        } else {
            // Normal Movement
            if (state.isMobile) {
                if(state.touchState.isTouching) {
                   moveSpeed = 1;
                   // Turn based on x position relative to center
                   const cx = window.innerWidth / 2;
                   const dx = state.touchState.x - cx;
                   turn = (dx / cx) * 2; // -2 to 2
                }
            } else {
                if(state.keys['KeyW'] || state.keys['ArrowUp']) moveSpeed = 1;
                if(state.keys['KeyS'] || state.keys['ArrowDown']) moveSpeed = -0.5;
                if(state.keys['KeyA'] || state.keys['ArrowLeft']) turn = 1;
                if(state.keys['KeyD'] || state.keys['ArrowRight']) turn = -1;
                if(state.keys['Space']) jump = true;
            }
        }

        // 2. PHYSICS (Raycast to Ground)
        if (state.gameState === "PLAYING") {
            // Apply Gravity
            state.playerVerticalSpeed -= CFG.gravity * dt;
            
            // Raycast down from local "Up"
            const playerPos = playerWrapper.position.clone();
            const planetCenter = new THREE.Vector3(0,0,0);
            const playerDir = playerPos.clone().sub(planetCenter).normalize();
            
            // Cast from slightly above predicted position
            const rayOrigin = playerPos.clone().add(playerDir.multiplyScalar(5));
            gravityRaycaster.set(rayOrigin, playerDir.clone().negate());
            
            const intersects = gravityRaycaster.intersectObject(planet);
            let groundHeight = CFG.planetRadius; // Fallback
            
            if (intersects.length > 0) {
                const point = intersects[0].point;
                groundHeight = point.distanceTo(planetCenter);
            }

            // Current distance from center
            let currentDist = playerPos.length();
            let nextDist = currentDist + (state.playerVerticalSpeed * dt);

            // Ground Collision
            if (nextDist <= groundHeight) {
                nextDist = groundHeight;
                state.playerVerticalSpeed = 0;
                state.isGrounded = true;
                
                // JUMP
                if(jump) {
                    state.playerVerticalSpeed = CFG.jumpForce;
                    state.isGrounded = false;
                }
            } else {
                state.isGrounded = false;
            }

            // Apply Height
            playerWrapper.position.copy(playerDir.multiplyScalar(nextDist));

            // 3. MOVEMENT (Local Tangent)
            if (turn !== 0) {
                playerWrapper.rotateY(turn * CFG.turnSpeed * dt);
            }

            if (moveSpeed !== 0) {
                playerWrapper.translateZ(-moveSpeed * CFG.moveSpeed * dt);
            }

            // 4. ORIENTATION (Align to planet surface)
            const currentUp = new THREE.Vector3(0, 1, 0).applyQuaternion(playerWrapper.quaternion);
            const targetUp = playerWrapper.position.clone().normalize();
            tempQuat.setFromUnitVectors(currentUp, targetUp);
            playerWrapper.quaternion.premultiply(tempQuat);
            
            // Waddle Animation
            if (moveSpeed !== 0) {
                playerMesh.rotation.z = Math.sin(clock.getElapsedTime() * 15) * 0.1;
                playerMesh.rotation.x = Math.sin(clock.getElapsedTime() * 20) * 0.05; // bob
            } else {
                playerMesh.rotation.z *= 0.8;
                playerMesh.rotation.x *= 0.8;
            }
        }

        // 5. INTERACTION CHECK
        let nearestNPC = null;
        let minDst = 5.0;
        
        for(const npc of state.npcs) {
            const d = playerWrapper.position.distanceTo(npc.group.position);
            if(d < minDst) {
                minDst = d;
                nearestNPC = npc;
            }
        }
        
        const promptEl = document.getElementById('interact-prompt');
        if (nearestNPC && state.gameState === "PLAYING") {
            state.activeNPC = nearestNPC;
            state.canInteract = true;
            promptEl.style.display = 'block';
        } else {
            state.canInteract = false;
            promptEl.style.display = 'none';
        }

        // 6. CAMERA
        // "RPG Follow" - Smoothly follow behind
        // Calculate ideal position: Behind player and up
        const idealOffset = new THREE.Vector3(0, CFG.camHeight, CFG.camDistance);
        idealOffset.applyQuaternion(playerWrapper.quaternion);
        idealOffset.add(playerWrapper.position);
        
        // Lerp camera position
        camera.position.lerp(idealOffset, CFG.camLag);
        camera.lookAt(playerWrapper.position);
        
        // Ensure camera up is planet up
        const camUp = playerWrapper.position.clone().normalize();
        camera.up.copy(camUp); // Important for spherical worlds

        // Lighting
        dirLight.position.copy(camera.position).add(new THREE.Vector3(10, 20, 10));

        renderer.render(scene, camera);
    }
    animate();
}

export function handleAction() {
    if (state.gameState === "WAITING") {
        state.gameState = "PLAYING";
        document.getElementById('start-screen').style.display = 'none';
        document.getElementById('ui-layer').classList.remove('hidden');
        resetInputs();
        
        // TELEPORT PLAYER HIGH ABOVE SPAWN
        // Use a safe height (Radius + 20) to ensure we don't spawn inside a mountain
        playerWrapper.position.set(0, CFG.planetRadius + 20, 0);
        playerWrapper.quaternion.identity(); // Reset rotation so Up is Y
        
        // Reset Physics
        state.playerVerticalSpeed = 0;
        
        // SNAP CAMERA
        // Force the camera to the correct position relative to the NEW player position immediately
        const snapOffset = new THREE.Vector3(0, CFG.camHeight, CFG.camDistance);
        camera.position.copy(playerWrapper.position).add(snapOffset);
        camera.up.set(0, 1, 0); // Explicitly set Up vector for North Pole spawn
        camera.lookAt(playerWrapper.position);
        
        // Update Light immediately
        dirLight.position.copy(camera.position).add(new THREE.Vector3(10, 20, 10));
        dirLight.target = playerWrapper;
    } 
    else if (state.gameState === "PLAYING" && state.canInteract && state.keys['Space']) {
        startDialogue();
    }
    else if (state.gameState === "DIALOGUE" && state.keys['Space']) {
        advanceDialogue();
    }
}

function startDialogue() {
    state.gameState = "DIALOGUE";
    state.keys['Space'] = false; // consume input
    state.dialogueIndex = 0;
    
    document.getElementById('ui-layer').classList.add('hidden'); // Hide prompt
    const box = document.getElementById('dialogue-box');
    box.style.display = 'block';
    
    updateDialogueText();
}

function advanceDialogue() {
    state.keys['Space'] = false; // consume input
    state.dialogueIndex++;
    if (state.activeNPC && state.dialogueIndex < state.activeNPC.dialogs.length) {
        updateDialogueText();
    } else {
        endDialogue();
    }
}

function updateDialogueText() {
    document.getElementById('dialogue-text').innerText = state.activeNPC.dialogs[state.dialogueIndex];
    document.getElementById('dialogue-name').innerText = "Traveler " + state.activeNPC.id;
}

function endDialogue() {
    state.gameState = "PLAYING";
    document.getElementById('dialogue-box').style.display = 'none';
    document.getElementById('ui-layer').classList.remove('hidden');
    // Cooldown or move away logic could go here
}
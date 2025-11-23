

import * as THREE from 'three';
import { CFG } from './config.js';

export const scene = new THREE.Scene();
scene.background = new THREE.Color(CFG.colors.bg);
// Fog disabled to debug visibility
// scene.fog = new THREE.Fog(CFG.colors.bg, CFG.planetRadius * 0.5, CFG.planetRadius * 1.5);

// DEBUG: Add global axes helper to verify camera orientation
// Red = X, Green = Y, Blue = Z
const globalAxes = new THREE.AxesHelper(100);
scene.add(globalAxes);

export const worldLayer = new THREE.Group();
scene.add(worldLayer);

export const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// RPG usually benefits from Perspective, but Ortho is key to this art style. 
// We adjust the frustum to fit the larger world.
// Reduced d from 24 to 16 to zoom in VERY close ("Close to the box")
const d = 16; 
const aspect = window.innerWidth / window.innerHeight;
// Increased Far plane to 4000 to prevent clipping
export const camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 4000);
scene.add(camera);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambientLight);

export const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.castShadow = true;
// Increase shadow map size for larger world
dirLight.shadow.mapSize.set(2048, 2048);
const shadowSize = 100;
dirLight.shadow.camera.left = -shadowSize;
dirLight.shadow.camera.right = shadowSize;
dirLight.shadow.camera.top = shadowSize;
dirLight.shadow.camera.bottom = -shadowSize;
dirLight.shadow.camera.far = 400; // Ensure shadow camera reaches ground
scene.add(dirLight);

export const mat = {
    // Planet material uses Vertex Colors now
    planet: new THREE.MeshToonMaterial({ vertexColors: true }),
    player: new THREE.MeshToonMaterial({ color: CFG.colors.player }),
    npc: new THREE.MeshToonMaterial({ color: CFG.colors.npc }),
    tree: new THREE.MeshToonMaterial({ color: CFG.colors.tree }),
    trunk: new THREE.MeshToonMaterial({ color: CFG.colors.trunk }),
    // Switch to Lambert for flat shading support
    rock: new THREE.MeshLambertMaterial({ color: CFG.colors.rock, flatShading: true }),
    outline: new THREE.MeshBasicMaterial({ color: CFG.colors.outline, side: THREE.BackSide })
};

export function addOutline(mesh, geometry, scaleOverride = 1.0) {
    const outlineMesh = new THREE.Mesh(geometry, mat.outline);
    const s = 1 + CFG.outlineThickness * scaleOverride;
    outlineMesh.scale.set(s, s, s);
    mesh.add(outlineMesh);
}

export function handleResize() {
    const newAspect = window.innerWidth / window.innerHeight;
    camera.left = -d * newAspect;
    camera.right = d * newAspect;
    camera.top = d;
    camera.bottom = -d;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}
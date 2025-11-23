import * as THREE from 'three';
import { CFG } from './config.js';

export const scene = new THREE.Scene();
scene.background = new THREE.Color(CFG.colors.bg);
// Fog matches sky, starts closer to fade out the curvature
scene.fog = new THREE.Fog(CFG.colors.bg, CFG.planetRadius * 0.5, CFG.planetRadius * 1.5);

export const worldLayer = new THREE.Group();
scene.add(worldLayer);

export const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// RPG usually benefits from Perspective, but Ortho is key to this art style. 
// We adjust the frustum to fit the larger world.
const d = 40;
const aspect = window.innerWidth / window.innerHeight;
export const camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 500);
scene.add(camera);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambientLight);

export const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.castShadow = true;
// Increase shadow map size for larger world, but keep it reasonable
dirLight.shadow.mapSize.set(2048, 2048);
const shadowSize = 80;
dirLight.shadow.camera.left = -shadowSize;
dirLight.shadow.camera.right = shadowSize;
dirLight.shadow.camera.top = shadowSize;
dirLight.shadow.camera.bottom = -shadowSize;
scene.add(dirLight);

export const mat = {
    // Planet material uses Vertex Colors now
    planet: new THREE.MeshToonMaterial({ vertexColors: true }),
    player: new THREE.MeshToonMaterial({ color: CFG.colors.player }),
    npc: new THREE.MeshToonMaterial({ color: CFG.colors.npc }),
    tree: new THREE.MeshToonMaterial({ color: CFG.colors.tree }),
    trunk: new THREE.MeshToonMaterial({ color: CFG.colors.trunk }),
    // Switch to Lambert or Standard for flat shading support (Toon doesn't support flatShading property in this version)
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
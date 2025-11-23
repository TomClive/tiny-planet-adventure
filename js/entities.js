


import * as THREE from 'three';
import { CFG } from './config.js';
import { scene, worldLayer, mat, addOutline, dirLight } from './graphics.js';
import { state } from './state.js';

export const upVector = new THREE.Vector3(0, 1, 0);

// --- DETERMINISTIC TERRAIN ---
// A simple pseudo-noise function to keep terrain fixed without external libs
// Added extra octaves for "more geometry" detail
function pseudoNoise(x, y, z) {
    const s1 = 0.08;
    const s2 = 0.15;
    const s3 = 0.3;
    
    // Large features
    let v = Math.sin(x * s1) * Math.cos(z * s1);
    // Medium features
    v += Math.sin(y * s2 + x * s2) * 0.5;
    // Small detailed features
    v += Math.sin((x + z) * s3) * 0.25;
    
    return v;
}

// Planet Geometry
// Detail 6 = High resolution terrain
const planetGeo = new THREE.IcosahedronGeometry(CFG.planetRadius, 6);

// Convert to non-indexed for "Flat Shading" / Crystal look
// This splits vertices so each face has unique normals
planetGeo.deleteAttribute('normal');
planetGeo.deleteAttribute('uv');

// Check if index exists before converting to avoid warnings
const finalPlanetGeo = planetGeo.index ? planetGeo.toNonIndexed() : planetGeo; 

const posAttribute = finalPlanetGeo.attributes.position;
const colors = [];

const colorLow = new THREE.Color(CFG.colors.planetLow);
const colorBase = new THREE.Color(CFG.colors.planetBase);
const colorHigh = new THREE.Color(CFG.colors.planetHigh);
const tmpColor = new THREE.Color();

for (let i = 0; i < posAttribute.count; i++) {
    const x = posAttribute.getX(i);
    const y = posAttribute.getY(i);
    const z = posAttribute.getZ(i);

    const v = new THREE.Vector3(x, y, z).normalize();
    // Noise determines height variation
    const noiseVal = pseudoNoise(x, y, z);
    const height = CFG.planetRadius + (noiseVal * 10); // Slightly increased amplitude for terrain
    
    // Apply height
    v.multiplyScalar(height);
    posAttribute.setXYZ(i, v.x, v.y, v.z);

    // Color based on height (relative to base radius)
    const relativeH = height - CFG.planetRadius;
    if(relativeH < -4) {
        colors.push(colorLow.r, colorLow.g, colorLow.b); // Sand
    } else if (relativeH > 6) {
        colors.push(colorHigh.r, colorHigh.g, colorHigh.b); // Rock/Mountain
    } else {
        // Slight variation in grass
        tmpColor.copy(colorBase).offsetHSL(0, 0, Math.random() * 0.05);
        colors.push(tmpColor.r, tmpColor.g, tmpColor.b);
    }
}

finalPlanetGeo.computeVertexNormals();
finalPlanetGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

export const planet = new THREE.Mesh(finalPlanetGeo, mat.planet);
planet.receiveShadow = true;
scene.add(planet);


// --- PLAYER ---
export const playerWrapper = new THREE.Group();
// Start slightly above to avoid clipping before physics kicks in
playerWrapper.position.set(0, CFG.planetRadius + 10, 0);

// DEBUG: Add axes to player to confirm it exists and where it is facing
const playerAxes = new THREE.AxesHelper(5);
playerWrapper.add(playerAxes);

scene.add(playerWrapper);
dirLight.target = playerWrapper;

const playerGeo = new THREE.BoxGeometry(1.5, 1.5, 1.5);
export const playerMesh = new THREE.Mesh(playerGeo, mat.player);
playerMesh.position.y = 0.75;
playerMesh.castShadow = true;
playerMesh.receiveShadow = true;
addOutline(playerMesh, playerGeo);
playerWrapper.add(playerMesh);


// --- SPAWNING ---

// Raycaster for placing objects on ground
const placeRaycaster = new THREE.Raycaster();

function getSurfacePos(idealPos) {
    // Cast from high up towards center
    const origin = idealPos.clone().normalize().multiplyScalar(CFG.planetRadius * 2);
    const direction = origin.clone().negate().normalize();
    
    placeRaycaster.set(origin, direction);
    const intersects = placeRaycaster.intersectObject(planet);
    
    if(intersects.length > 0) return intersects[0].point;
    return idealPos.normalize().multiplyScalar(CFG.planetRadius);
}

function spawnObject(type, count) {
    for(let i=0; i<count; i++) {
        // Random spherical coord
        const phi = Math.acos(-1 + (2 * Math.random()));
        const theta = Math.sqrt(Math.PI * 50 * phi) * phi;
        const x = Math.cos(theta) * Math.sin(phi);
        const y = Math.sin(theta) * Math.sin(phi);
        const z = Math.cos(phi);
        
        const rawPos = new THREE.Vector3(x, y, z);
        const surfacePos = getSurfacePos(rawPos);
        
        // Don't spawn underwater/sand deep
        const dist = surfacePos.length();
        if(dist < CFG.planetRadius - 2) continue; 

        const group = new THREE.Group();
        group.position.copy(surfacePos);
        group.quaternion.setFromUnitVectors(upVector, surfacePos.clone().normalize());

        if(type === 'tree') {
            const trunkGeo = new THREE.CylinderGeometry(0.2, 0.4, 1.5, 5);
            trunkGeo.translate(0, 0.75, 0);
            const trunk = new THREE.Mesh(trunkGeo, mat.trunk);
            trunk.castShadow = true;
            addOutline(trunk, trunkGeo);
            group.add(trunk);

            // Multiple cones for pine look
            const l1 = new THREE.ConeGeometry(1.2, 2, 5);
            l1.translate(0, 2, 0);
            const m1 = new THREE.Mesh(l1, mat.tree);
            m1.castShadow = true;
            addOutline(m1, l1);
            group.add(m1);
            
            const l2 = new THREE.ConeGeometry(0.9, 1.5, 5);
            l2.translate(0, 3, 0);
            const m2 = new THREE.Mesh(l2, mat.tree);
            m2.castShadow = true;
            addOutline(m2, l2);
            group.add(m2);

        } else if (type === 'rock') {
            const rockGeo = new THREE.DodecahedronGeometry(Math.random() * 0.8 + 0.5, 0);
            const rock = new THREE.Mesh(rockGeo, mat.rock);
            rock.position.y = 0.5;
            rock.castShadow = true;
            rock.rotation.set(Math.random(), Math.random(), Math.random());
            addOutline(rock, rockGeo);
            group.add(rock);
        }

        worldLayer.add(group);
        state.scenery.push(group);
    }
}

export function spawnNPC(id, dialogs) {
    // Random position seeded roughly
    const vec = new THREE.Vector3(Math.random()-0.5, Math.random()-0.5, Math.random()-0.5).normalize();
    const surfacePos = getSurfacePos(vec);
    
    const group = new THREE.Group();
    group.position.copy(surfacePos);
    group.quaternion.setFromUnitVectors(upVector, surfacePos.clone().normalize());
    
    // NPC Visuals - Pink Box for now
    const geo = new THREE.BoxGeometry(1, 1.5, 1);
    const mesh = new THREE.Mesh(geo, mat.npc);
    mesh.position.y = 0.75;
    mesh.castShadow = true;
    addOutline(mesh, geo);
    group.add(mesh);
    
    // Add "!" floating above
    const markGeo = new THREE.SphereGeometry(0.2);
    const mark = new THREE.Mesh(markGeo, new THREE.MeshBasicMaterial({color: 0xFFFFFF}));
    mark.position.set(0, 2.5, 0);
    group.add(mark);

    worldLayer.add(group);
    state.npcs.push({ group, pos: surfacePos, dialogs, id });
}

export function buildWorld() {
    // Clear old
    while(worldLayer.children.length > 0) worldLayer.remove(worldLayer.children[0]);
    state.scenery = [];
    state.npcs = [];

    // Re-add planet
    if (!planet.parent) scene.add(planet);

    spawnObject('tree', 150);
    spawnObject('rock', 80);
    
    spawnNPC(1, ["Welcome to Tiny Planet!", "It's peaceful here.", "Try climbing the mountain."]);
    spawnNPC(2, ["I saw a huge rock over there.", "The view is great from the top.", "Take it easy."]);
    spawnNPC(3, ["Did you know this world loops?", "Just keep walking.", "See you around!"]);
    
    console.log("[ENTITIES] World Built. Planet Radius:", CFG.planetRadius);
}
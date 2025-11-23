


export const CFG = {
    colors: {
        bg: 0x7cdbd5, // Teal sky
        planetBase: 0x88c070, // Soft green
        planetLow: 0xe8dcb8, // Sand
        planetHigh: 0x808080, // Rock
        player: 0xFFD700,
        npc: 0xFF9999,
        tree: 0x4a8c5a,
        trunk: 0x7a5c4f,
        rock: 0x888899,
        outline: 0x1a2e2a // Darker teal outline
    },
    planetRadius: 120, // Much larger world
    moveSpeed: 12.0,
    turnSpeed: 4.0,
    jumpForce: 25.0, // Stronger jump for steep hills
    gravity: 60.0, // Snappier gravity
    outlineThickness: 0.015,
    // Camera is physically far away to avoid clipping terrain hills, 
    // but the Orthographic lens (in graphics.js) is zoomed in tight.
    camHeight: 45, 
    camDistance: 45, 
    camLag: 0.15
};
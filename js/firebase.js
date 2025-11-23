import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { state } from './state.js';

const firebaseConfig = {
    apiKey: "AIzaSyB0pnhWTX7edqLipE1OQZUaqaallOEPMdw",
    authDomain: "waddle-box.firebaseapp.com",
    projectId: "waddle-box",
    storageBucket: "waddle-box.firebasestorage.app",
    messagingSenderId: "451829228466",
    appId: "1:451829228466:web:40da2b729aa61d9d667aab",
    measurementId: "G-R8CDWJX8K3"
};

let db = null;
try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
} catch(e) {
    console.warn("Firebase init failed:", e);
}

function trackEvent(eventName, params = {}) {
    if(typeof window.gtag === 'function') window.gtag('event', eventName, params);
}

export const leaderboard = {
    submitScore: async function(nameInputId, buttonId) {
        if(!db) { alert("Database not connected."); return; }
        
        const rawName = document.getElementById(nameInputId).value;
        const name = rawName.replace(/[^a-zA-Z0-9 ]/g, '').toUpperCase().trim().substring(0, 10) || "ANON";
        const score = state.totalScore || 0;
        const btn = document.getElementById(buttonId);
        
        btn.disabled = true; 
        btn.innerText = "...";
        
        try {
            await addDoc(collection(db, "leaderboard"), { name: name, score: score, timestamp: Date.now() });
            document.getElementById('submit-form').style.display = 'none';
            await this.show(true); 
            trackEvent('score_submit', { score: score });
        } catch (e) {
            console.error(e); 
            alert("Could not save score.");
            btn.disabled = false; 
            btn.innerText = "SUBMIT";
        }
    },

    show: async function(inGameOver = false) {
        if(!db) { alert("Leaderboard unavailable."); return; }
        
        const containerId = inGameOver ? 'leaderboard-ui' : 'hs-list';
        const wrapperId = inGameOver ? 'leaderboard-display' : 'highscore-overlay';
        
        document.getElementById(wrapperId).style.display = 'block';
        const ui = document.getElementById(containerId);
        ui.innerHTML = "Loading...";
        
        try {
            const q = query(collection(db, "leaderboard"), orderBy("score", "desc"), limit(10));
            const querySnapshot = await getDocs(q);
            let html = "";
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                const safeName = data.name ? data.name.replace(/</g, "&lt;") : "ANON";
                html += `<div class="flex justify-between border-b border-[#eee] py-[5px]"><span class="font-bold">${safeName}</span><span>${data.score}</span></div>`;
            });
            ui.innerHTML = html || "No scores yet.";
        } catch(e) { 
            ui.innerHTML = "Error loading scores."; 
        }
    }
};
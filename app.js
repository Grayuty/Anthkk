import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// YOUR CONFIG
const firebaseConfig = {
    apiKey: "AIzaSyAwDOMwWChGUQFnaeAeOOXAhMlfnsZiclc",
    authDomain: "anthk-a5e8b.firebaseapp.com",
    projectId: "anthk-a5e8b",
    storageBucket: "anthk-a5e8b.firebasestorage.app",
    messagingSenderId: "663178679910",
    appId: "1:663178679910:web:2ea1cc946ec03c6834bfa7"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ID GENERATOR
const adjs = ["Swift", "Neon", "Mystic", "Brave", "Silent", "Vivid", "Wild"];
const nouns = ["Orca", "Ghost", "Falcon", "Nova", "Pixel", "Sage", "Tiger"];
const generateID = () => `${adjs[Math.floor(Math.random()*adjs.length)]}-${nouns[Math.floor(Math.random()*nouns.length)]}-${Math.floor(1000+Math.random()*9000)}`;

let myId = localStorage.getItem('anon_id');
let currentChatId = null;
let unsubscribe = null;

// VIEW CONTROLLER
function showView(id) {
    document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
    document.getElementById(id).style.display = 'flex';
}

// IMAGE COMPRESSION (Max 800px)
async function compressImage(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const max = 800;
                let w = img.width, h = img.height;
                if (w > h && w > max) { h *= max/w; w = max; }
                else if (h > max) { w *= max/h; h = max; }
                canvas.width = w; canvas.height = h;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, w, h);
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
        };
    });
}

// CHAT LOGIC
async function openChat(partnerId) {
    if (!partnerId || partnerId === myId) return;
    currentChatId = [myId, partnerId].sort().join('_');
    window.location.hash = `chat-${partnerId}`;
    
    showView('view-chat');
    document.getElementById('display-partner-id').innerText = partnerId;
    const container = document.getElementById('messages-container');
    container.innerHTML = '';

    if (unsubscribe) unsubscribe();
    const q = query(collection(db, "chats", currentChatId, "messages"), orderBy("timestamp", "asc"));
    
    unsubscribe = onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach(change => {
            if (change.type === "added") {
                const d = change.doc.data();
                const el = document.createElement('div');
                el.className = `msg ${d.senderId === myId ? 'sent' : 'received'}`;
                if (d.image) el.innerHTML = `<img src="${d.image}">`;
                if (d.text) el.innerHTML += `<div>${d.text}</div>`;
                container.appendChild(el);
                container.scrollTop = container.scrollHeight;
            }
        });
    });
}

// SENDING
async function sendMsg(text = null, img = null) {
    if (!text && !img) return;
    await addDoc(collection(db, "chats", currentChatId, "messages"), {
        senderId: myId,
        text: text,
        image: img,
        timestamp: serverTimestamp(),
        expiresAt: new Date(Date.now() + 86400000) // 24h
    });
}

// BUTTON ACTIONS
document.getElementById('btn-generate').onclick = () => {
    myId = generateID();
    localStorage.setItem('anon_id', myId);
    location.reload();
};

document.getElementById('btn-start-chat').onclick = () => {
    openChat(document.getElementById('partner-id-input').value.trim());
};

document.getElementById('btn-send').onclick = () => {
    const input = document.getElementById('msg-input');
    sendMsg(input.value.trim());
    input.value = '';
};

document.getElementById('img-input').onchange = async (e) => {
    const file = e.target.files[0];
    if (file) {
        const compressed = await compressImage(file);
        sendMsg(null, compressed);
    }
};

document.getElementById('btn-back').onclick = () => {
    window.location.hash = '';
    location.reload();
};

// INITIALIZE
if (!myId) {
    showView('view-onboard');
} else {
    document.getElementById('display-my-id').innerText = myId;
    const hash = window.location.hash;
    if (hash.startsWith('#chat-')) {
        openChat(hash.replace('#chat-', ''));
    } else {
        showView('view-home');
    }
}

/* ===== FIREBASE SDK ===== */
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import { 
    getFirestore, 
    doc, 
    setDoc,
    getDoc,
    getDocs,
    collection,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

import { 
    getAuth,
    signInAnonymously
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";

/* ===== FIREBASE CONFIG ===== */
const firebaseConfig = {
  apiKey: "AIzaSyB6ds9mU-xvF1LSvhaeCNtMbROu0k",
  authDomain: "cifromania-ac182.firebaseapp.com",
  projectId: "cifromania-ac182",
  storageBucket: "cifromania-ac182.appspot.com",
  messagingSenderId: "165208255580",
  appId: "1:165208255580:web:b36744f0eb527b6571129"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

/* ===== АНОНИМЕН AUTH ===== */
signInAnonymously(auth)
    .then(() => console.log("Signed in anonymously"))
    .catch(err => console.error("Auth error:", err));

/* ===== КОЛЕКЦИЯТА ЗА МАЙ ===== */
const calendarRef = collection(db, "calendar", "may", "days");

/* ============================================================
   ЧАКАМЕ DOM‑а ДА СЕ ЗАРЕДИ, ЗА ДА МОЖЕМ ДА ЗАХАПЕМ КЛЕТКИТЕ
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {

    /* ===== LIVE UPDATE ОТ FIRESTORE ===== */
    onSnapshot(calendarRef, snap => {
        snap.forEach(docSnap => {
            const day = docSnap.id;
            const data = docSnap.data();
            const cell = document.querySelector(`.day-cell[data-day="${day}"]`);

            if (!cell) return;

            // Показваме деня + текста вътре
            if (!data.takenBy) {
                cell.innerHTML = `<strong>${day}</strong>`;
            } else {
                cell.innerHTML = `<strong>${day}</strong><br>${data.takenBy}`;
            }
        });
    });

    /* ===== КЛИК ВЪРХУ КЛЕТКА ===== */
    document.querySelectorAll(".day-cell").forEach(cell => {
        cell.onclick = async () => {

            let playerId = localStorage.getItem("playerId");
            let playerName = localStorage.getItem("playerName");

            /* ===== ИСКАМЕ ID КОД ПРИ КЛИК ===== */
            if (!playerId || !window.PLAYERS[playerId]) {
    playerId = prompt("Въведи своя ID код:");
    if (!window.PLAYERS[playerId]) {        // ← тук беше пропуснато
        alert("Невалиден ID код.");
        return;
    }
    playerName = window.PLAYERS[playerId];
    localStorage.setItem("playerId", playerId);
    localStorage.setItem("playerName", playerName);
}

            const day = cell.dataset.day;
            const docRef = doc(db, "calendar", "may", "days", day);
            const docSnap = await getDoc(docRef);

            /* ===== АКО ДЕНЯТ Е ЗАЕТ ===== */
            if (docSnap.exists() && docSnap.data().takenBy) {
                alert("Тази дата вече е заета.");
                return;
            }

            /* ===== ЗАПИСВАМЕ В FIRESTORE ===== */
            await setDoc(docRef, {
                takenBy: playerName,
                uid: playerId,
                timestamp: Date.now()
            });

            alert("Успешно избра дата!");
        };
    });

});

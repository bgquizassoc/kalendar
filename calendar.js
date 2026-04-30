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

/* ===== КАЛЕНДАР ===== */
const calendarRef = collection(db, "calendar", "may", "days");

/* ===== ЗАРЕЖДАНЕ НА КАЛЕНДАРА ===== */
function loadCalendar() {
    onSnapshot(calendarRef, snap => {
        snap.forEach(docSnap => {
            const day = docSnap.id;
            const data = docSnap.data();
            const cell = document.querySelector(`.day-cell[data-day="${day}"]`);

            if (!cell) return;

            cell.classList.remove("day-free", "day-taken", "day-mine");

            if (!data.takenBy) {
                cell.classList.add("day-free");
                cell.textContent = day;
            } else {
                const savedId = localStorage.getItem("playerId");
                if (data.uid === savedId) {
                    cell.classList.add("day-mine");
                    cell.textContent = `${day} — Ти`;
                } else {
                    cell.classList.add("day-taken");
                    cell.textContent = `${day} — ${data.takenBy}`;
                }
            }
        });
    });
}

loadCalendar();

/* ===== ПРОВЕРКА ДАЛИ ИГРАЧЪТ ВЕЧЕ ИМА ДАТА ===== */
async function playerAlreadyHasDate(playerId) {
    const snap = await getDocs(calendarRef);
    let found = false;

    snap.forEach(docSnap => {
        const data = docSnap.data();
        if (data.uid === playerId) found = true;
    });

    return found;
}

/* ===== ИЗБОР НА ДАТА ===== */
document.querySelectorAll(".day-cell").forEach(cell => {
    cell.onclick = async () => {

        let playerId = localStorage.getItem("playerId");
        let playerName = localStorage.getItem("playerName");

        if (!playerId || !PLAYERS[playerId]) {
            playerId = prompt("Въведи своя ID код:");
            if (!PLAYERS[playerId]) {
                alert("Невалиден ID код.");
                return;
            }
            playerName = PLAYERS[playerId];
            localStorage.setItem("playerId", playerId);
            localStorage.setItem("playerName", playerName);
        }

        const day = cell.dataset.day;
        const docRef = doc(db, "calendar", "may", "days", day);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists() && docSnap.data().takenBy) {
            alert("Тази дата вече е заета.");
            return;
        }

        if (await playerAlreadyHasDate(playerId)) {
            alert("Можеш да избереш само една дата.");
            return;
        }

        await setDoc(docRef, {
            takenBy: playerName,
            uid: playerId,
            timestamp: Date.now()
        });

        alert("Успешно избра дата!");
    };
});

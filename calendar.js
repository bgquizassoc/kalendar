import { PLAYERS } from "./players.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, collection, onSnapshot } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBG6msl90Jln_-xIwfLSVahc0NTWbR0uok",
    authDomain: "cifromania-ac182.firebaseapp.com",
    projectId: "cifromania-ac182",
    storageBucket: "cifromania-ac182.firebasestorage.app",
    messagingSenderId: "165200525580",
    appId: "1:165200525580:web:ba63744ebe0527b6517129"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const calendarRef = collection(db, "calendar", "may", "days");

document.addEventListener("DOMContentLoaded", () => {

    onSnapshot(calendarRef, snap => {
        snap.forEach(docSnap => {
            const day = docSnap.id;
            const data = docSnap.data();
            const cell = document.querySelector(`.day-cell[data-day="${day}"]`);
            if (!cell) return;
            if (!data.text) {
                cell.innerHTML = `<strong>${day}</strong>`;
            } else {
                cell.innerHTML = `<strong>${day}</strong><br>${data.text}`;
            }
        });
    });

    document.querySelectorAll(".day-cell").forEach(cell => {
        cell.onclick = async () => {
            let playerId = localStorage.getItem("playerId");
            let playerName = localStorage.getItem("playerName");

            if (!playerId || !window.PLAYERS[playerId]) {
                playerId = prompt("Въведи своя ID код:");
                if (!playerId || !window.PLAYERS[playerId]) {
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

            if (docSnap.exists() && docSnap.data().takenBy) {
                alert("Тази дата вече е заета.");
                return;
            }

            const text = prompt(`Опиши събитието за ${day} май:`);
            if (!text) return;

            await setDoc(docRef, {
                takenBy: playerName,
                uid: playerId,
                text: text,
                timestamp: Date.now()
            });
            alert("Успешно записа събитието!");
        };
    });
});

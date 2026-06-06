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

/* ===== МЕСЕЦИ: конфигурация ===== */
const MONTHS = [
    { key: "may",  label: "05/26", name: "Май 2026",  days: 31, startDay: 4 }, // 4 = петък (0=пн)
    { key: "june", label: "06/26", name: "Юни 2026",  days: 30, startDay: 0 }, // 0 = понеделник
    { key: "july", label: "07/26", name: "Юли 2026",  days: 31, startDay: 2 }, // 2 = сряда
];

let currentMonthIndex = 0; // Ще се изчисли автоматично

/* ===== ПОМОЩНИ ФУНКЦИИ ===== */
function getPlayerId() {
    return localStorage.getItem("playerId");
}
function getPlayerName() {
    return localStorage.getItem("playerName");
}
function hasBookedThisMonth(monthKey) {
    return localStorage.getItem(`booked_${monthKey}`) === "true";
}
function setBookedThisMonth(monthKey) {
    localStorage.setItem(`booked_${monthKey}`, "true");
}

/* ===== ПОСТРОЯВАНЕ НА КАЛЕНДАРА ===== */
function buildCalendarGrid(month) {
    const grid = document.getElementById("calendarGrid");
    grid.innerHTML = "";

    // Заглавия на дните
    ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"].forEach(d => {
        const el = document.createElement("div");
        el.className = "weekday";
        el.textContent = d;
        grid.appendChild(el);
    });

    // Празни клетки преди първия ден
    for (let i = 0; i < month.startDay; i++) {
        const el = document.createElement("div");
        el.className = "empty";
        grid.appendChild(el);
    }

    // Дните
    for (let d = 1; d <= month.days; d++) {
        const cell = document.createElement("div");
        cell.className = "day-cell";
        cell.dataset.day = d;
        cell.innerHTML = `<strong>${d}</strong>`;
        grid.appendChild(cell);
    }
}

/* ===== ЗАРЕЖДАНЕ НА ДАННИ ОТ FIRESTORE ===== */
let unsubscribe = null;

function loadMonth(monthIndex) {
    currentMonthIndex = monthIndex;
    const month = MONTHS[monthIndex];

    // Обновяване на заглавието
    document.getElementById("calendarMonthTitle").textContent = month.name;

    // Построяване на грида
    buildCalendarGrid(month);

    // Спиране на предишния listener
    if (unsubscribe) unsubscribe();

    // Live данни от Firestore
    const colRef = collection(db, "calendar", month.key, "days");
    unsubscribe = onSnapshot(colRef, snap => {
        snap.forEach(docSnap => {
            const day = docSnap.id;
            const data = docSnap.data();
            const cell = document.querySelector(`.day-cell[data-day="${day}"]`);
            if (!cell) return;
            if (data.text) {
                cell.innerHTML = `<strong>${day}</strong><br><span style="font-size:13px">${data.text}</span>`;
                if (data.uid === getPlayerId()) {
                    cell.style.border = "2px solid #ffcc00"; // маркираме собствената клетка
                }
            }
        });

        // Закачаме клик събитията след зареждане
        attachClickHandlers(month);
    });

    // Обновяване на бутоните за месеци
    document.querySelectorAll(".month-btn").forEach((btn, i) => {
        btn.classList.toggle("active", i === monthIndex);
    });
}

/* ===== КЛИК ВЪРХУ КЛЕТКА ===== */
function attachClickHandlers(month) {
    document.querySelectorAll(".day-cell").forEach(cell => {
        cell.onclick = async () => {
            // 1. Проверка/вход с код
            let playerId = getPlayerId();
            let playerName = getPlayerName();

            if (!playerId || !PLAYERS[playerId]) {
                playerId = prompt("Въведи своя ID код:");
                if (!playerId || !PLAYERS[playerId]) {
                    alert("Невалиден ID код.");
                    return;
                }
                playerName = PLAYERS[playerId];
                localStorage.setItem("playerId", playerId);
                localStorage.setItem("playerName", playerName);
            }

            const day = cell.dataset.day;
            const docRef = doc(db, "calendar", month.key, "days", day);
            const docSnap = await getDoc(docRef);
            const data = docSnap.exists() ? docSnap.data() : null;

            // 2. Ако клетката е наша — предлагаме редактиране
            if (data && data.uid === playerId) {
                const newText = prompt(`Редактирай събитието за ${day} ${month.name}:`, data.text);
                if (newText === null) return; // натиснат Cancel
                if (newText.trim() === "") {
                    alert("Не можеш да запишеш празен текст.");
                    return;
                }
                await setDoc(docRef, { ...data, text: newText.trim() });
                alert("Успешно редактира събитието!");
                return;
            }

            // 3. Ако клетката е заета от друг
            if (data && data.takenBy) {
                alert(`Тази дата вече е заета от ${data.takenBy}.`);
                return;
            }

            // 4. Проверка: вече е записал събитие за този месец
            if (hasBookedThisMonth(month.key)) {
                alert(`Вече си записал събитие за ${month.name}. Можеш да запишеш само едно събитие на месец.`);
                return;
            }

            // 5. Записване на ново събитие
            const text = prompt(`Опиши събитието за ${day} ${month.name}:`);
            if (!text || text.trim() === "") return;

            await setDoc(docRef, {
                takenBy: playerName,
                uid: playerId,
                text: text.trim(),
                timestamp: Date.now()
            });

            setBookedThisMonth(month.key);
            alert("Успешно записа събитието!");
        };
    });
}

/* ===== ИНИЦИАЛИЗАЦИЯ ===== */
document.addEventListener("DOMContentLoaded", () => {
    // Автоматично избираме текущия месец
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1-12
    const currentYear = now.getFullYear();

    // Намираме подходящия индекс (по-близкия бъдещ или текущ месец)
    let startIndex = MONTHS.findIndex(m => {
        const [mm, yy] = m.label.split("/").map(Number);
        return (2000 + yy) > currentYear || ((2000 + yy) === currentYear && mm >= currentMonth);
    });
    if (startIndex === -1) startIndex = MONTHS.length - 1;

    // Построяване на бутоните за месеци
    const nav = document.getElementById("monthNav");
    MONTHS.forEach((m, i) => {
        const btn = document.createElement("button");
        btn.className = "month-btn";
        btn.textContent = m.label;
        btn.onclick = () => loadMonth(i);
        nav.appendChild(btn);
    });

    // Зареждаме текущия месец
    loadMonth(startIndex);
});

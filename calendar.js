import { PLAYERS, ROLES } from "./players.js";
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

/* ===== МЕСЕЦИ ===== */
const MONTHS = [
    { key: "may",  label: "05/26", name: "Май 2026",  days: 31, startDay: 4 },
    { key: "june", label: "06/26", name: "Юни 2026",  days: 30, startDay: 0 },
    { key: "july", label: "07/26", name: "Юли 2026",  days: 31, startDay: 2 },
    { key: "august", label: "08/26", name: "Август 2026",  days: 31, startDay: 5 },
    { key: "sept", label: "09/26", name: "Септември 2026",  days: 30, startDay: 1 },
];

let currentMonthIndex = 0;
let unsubscribe = null;

/* ===== РОЛЯ ===== */
function getRole(playerId) {
    return ROLES[playerId] || "player";
}

/* ===== ЛОКАЛНО ЗАПОМНЯНЕ ===== */
function getPlayerId() { return localStorage.getItem("playerId"); }
function getPlayerName() { return localStorage.getItem("playerName"); }
function hasBookedThisMonth(monthKey) {
    return localStorage.getItem("booked_" + monthKey) === "true";
}
function setBookedThisMonth(monthKey) {
    localStorage.setItem("booked_" + monthKey, "true");
}

/* ===== ПАРСВАНЕ НА ЧАС ===== */
function parseHour(text) {
    const m = text.match(/^(\d{1,2})[,\.:h](\d{2})/);
    if (m) return parseInt(m[1]) + parseInt(m[2]) / 100;
    return 99;
}

/* ===== РЕНДИРАНЕ НА КЛЕТКА ===== */
function renderCell(cell, events, day) {
    if (!events || events.length === 0) {
        cell.innerHTML = "<strong>" + day + "</strong>";
        cell.style.border = "2px solid #00509e";
        return;
    }
    const sorted = [...events].sort((a, b) => parseHour(a.text) - parseHour(b.text));
    const playerId = getPlayerId();
    let html = "<strong>" + day + "</strong>";
    sorted.forEach(ev => {
        const isOwn = ev.uid === playerId;
        const color = isOwn ? "#ffcc00" : "#aaddff";
        html += '<div style="margin-top:4px;font-size:18px;color:' + color + ';border-top:1px solid #00509e;padding-top:3px;text-align:left;">' + ev.text + '</div>';
    });
    cell.innerHTML = html;
    if (events.some(e => e.uid === playerId)) {
        cell.style.border = "2px solid #ffcc00";
    } else {
        cell.style.border = "2px solid #00509e";
    }
}

/* ===== ПОСТРОЯВАНЕ НА ГРИДА ===== */
function buildCalendarGrid(month) {
    const grid = document.getElementById("calendarGrid");
    grid.innerHTML = "";
    ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"].forEach(d => {
        const el = document.createElement("div");
        el.className = "weekday";
        el.textContent = d;
        grid.appendChild(el);
    });
    for (let i = 0; i < month.startDay; i++) {
        const el = document.createElement("div");
        el.className = "empty";
        grid.appendChild(el);
    }
    for (let d = 1; d <= month.days; d++) {
        const cell = document.createElement("div");
        cell.className = "day-cell";
        cell.dataset.day = d;
        cell.innerHTML = "<strong>" + d + "</strong>";
        grid.appendChild(cell);
    }
}

/* ===== ЗАРЕЖДАНЕ НА МЕСЕЦ ===== */
function loadMonth(monthIndex) {
    currentMonthIndex = monthIndex;
    const month = MONTHS[monthIndex];
    document.getElementById("calendarMonthTitle").textContent = month.name;
    buildCalendarGrid(month);
    if (unsubscribe) unsubscribe();
    const colRef = collection(db, "calendar", month.key, "days");
    unsubscribe = onSnapshot(colRef, snap => {
        document.querySelectorAll(".day-cell").forEach(cell => {
            const d = cell.dataset.day;
            cell.innerHTML = "<strong>" + d + "</strong>";
            cell.style.border = "2px solid #00509e";
        });
        snap.forEach(docSnap => {
            const day = docSnap.id;
            const data = docSnap.data();
            const cell = document.querySelector(".day-cell[data-day='" + day + "']");
            if (!cell) return;
            renderCell(cell, data.events || [], day);
        });
        attachClickHandlers(month);
    });
    document.querySelectorAll(".month-btn").forEach((btn, i) => {
        btn.classList.toggle("active", i === monthIndex);
    });
}

/* ===== КЛИК ВЪРХУ КЛЕТКА ===== */
function attachClickHandlers(month) {
    document.querySelectorAll(".day-cell").forEach(cell => {
        cell.onclick = async () => {

            // 1. Идентификация
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

            const role = getRole(playerId);
            const day = cell.dataset.day;
            const docRef = doc(db, "calendar", month.key, "days", day);
            const docSnap = await getDoc(docRef);
            const data = docSnap.exists() ? docSnap.data() : { events: [] };
            const events = data.events || [];

            // 2. ADMIN
            if (role === "admin") {
                const choice = prompt(
                    "ADMIN: " + day + " " + month.name + "\n" +
                    "Записи: " + events.length + "\n\n" +
                    "н - ново събитие\n" +
                    "р - редактирай\n" +
                    "и - изтрий"
                );
                if (!choice) return;
                if (choice.trim() === "н") {
                    const text = prompt("Ново събитие за " + day + " " + month.name + ":");
                    if (!text || !text.trim()) return;
                    events.push({ uid: playerId, takenBy: playerName, text: text.trim(), timestamp: Date.now() });
                    await setDoc(docRef, { events });
                    alert("Записано!");
                } else if (choice.trim() === "р") {
                    const list = events.map((e, i) => (i + 1) + ". " + e.text).join("\n");
                    const num = prompt("Кой запис да редактираш? (номер)\n" + list);
                    const idx = parseInt(num) - 1;
                    if (isNaN(idx) || idx < 0 || idx >= events.length) { alert("Невалиден номер."); return; }
                    const newText = prompt("Редактирай:", events[idx].text);
                    if (!newText || !newText.trim()) return;
                    events[idx].text = newText.trim();
                    await setDoc(docRef, { events });
                    alert("Редактирано!");
                } else if (choice.trim() === "и") {
                    const list = events.map((e, i) => (i + 1) + ". " + e.text).join("\n");
                    const num = prompt("Кой запис да изтриеш? (номер)\n" + list);
                    const idx = parseInt(num) - 1;
                    if (isNaN(idx) || idx < 0 || idx >= events.length) { alert("Невалиден номер."); return; }
                    events.splice(idx, 1);
                    await setDoc(docRef, { events });
                    alert("Изтрито!");
                }
                return;
            }

            // 3. MASTER
            if (role === "master") {
                const ownEvents = events.filter(e => e.uid === playerId);
                if (ownEvents.length > 0) {
                    const choice = prompt(
                        day + " " + month.name + " — твои записи: " + ownEvents.length + "\n\n" +
                        "н - ново събитие\n" +
                        "р - редактирай свое"
                    );
                    if (!choice) return;
                    if (choice.trim() === "р") {
                        const ev = ownEvents[0];
                        const newText = prompt("Редактирай:", ev.text);
                        if (!newText || !newText.trim()) return;
                        const idx = events.indexOf(ev);
                        events[idx].text = newText.trim();
                        await setDoc(docRef, { events });
                        alert("Редактирано!");
                        return;
                    }
                    if (choice.trim() !== "н") return;
                }
                const text = prompt("Ново събитие за " + day + " " + month.name + ":");
                if (!text || !text.trim()) return;
                events.push({ uid: playerId, takenBy: playerName, text: text.trim(), timestamp: Date.now() });
                await setDoc(docRef, { events });
                alert("Записано!");
                return;
            }

            // 4. PLAYER — един запис на месец
            const ownEvent = events.find(e => e.uid === playerId);
            if (hasBookedThisMonth(month.key)) {
                if (ownEvent) {
                    const newText = prompt("Редактирай събитието за " + day + " " + month.name + ":", ownEvent.text);
                    if (!newText || !newText.trim()) return;
                    const idx = events.indexOf(ownEvent);
                    events[idx].text = newText.trim();
                    await setDoc(docRef, { events });
                    alert("Редактирано!");
                } else {
                    alert("Вече си записал събитие за " + month.name + ". Можеш да запишеш само едно на месец.");
                }
                return;
            }
            let text = prompt("Опиши събитието за " + day + " " + month.name + ":\n(Напиши \"аз съм\" за Куиз Конфигуратор)");
            if (!text || !text.trim()) return;
            if (text.trim().toLowerCase() === "аз съм") {
                text = "Куиз Конфигуратор " + playerName;
            }
            events.push({ uid: playerId, takenBy: playerName, text: text.trim(), timestamp: Date.now() });
            await setDoc(docRef, { events });
            setBookedThisMonth(month.key);
            alert("Успешно записа събитието!");
        };
    });
}

/* ===== ИНИЦИАЛИЗАЦИЯ ===== */
document.addEventListener("DOMContentLoaded", () => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    let startIndex = MONTHS.findIndex(m => {
        const parts = m.label.split("/").map(Number);
        const mm = parts[0], yy = parts[1];
        return (2000 + yy) > currentYear || ((2000 + yy) === currentYear && mm >= currentMonth);
    });
    if (startIndex === -1) startIndex = MONTHS.length - 1;
    const nav = document.getElementById("monthNav");
    MONTHS.forEach((m, i) => {
        const btn = document.createElement("button");
        btn.className = "month-btn";
        btn.textContent = m.label;
        btn.onclick = () => loadMonth(i);
        nav.appendChild(btn);
    });
    loadMonth(startIndex);
});

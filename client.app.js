/**
 * @file client-app.js
 * @description Client-side logic for the Customer Portal.
 */

const API_URL = 'https://script.google.com/macros/s/AKfycbyyZHLsF9KDuRynsuNjweUHqVnNDZ9ZFIiDqRTT23aQSyJ98bCK4I6J1-EBMdNKrDvu/exec';

// --- Helpers ---
function getClientIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('clientId');
}

async function fetchData(payload) {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json;charset=utf-8' },
            body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error(`Network error: ${response.status}`);
        const data = await response.json();
        if (data.error) throw new Error(data.error);
        return data;
    } catch (err) {
        console.error('API error:', err);
        alert('אירעה שגיאה בתקשורת עם השרת: ' + err.message);
        return null;
    }
}

// --- DOM Elements ---
const clientNameHome = document.getElementById('client-name-home');
const activeOrdersContainer = document.getElementById('active-orders-container');
const noActiveOrders = document.getElementById('no-active-orders');
const historyTableBody = document.getElementById('history-table-body');
const chatTemplates = document.getElementById('chat-templates');
const chatForm = document.getElementById('chat-form');
const chatMessage = document.getElementById('chat-message');
const newOrderForm = document.getElementById('new-order-form');
const addressSelect = document.getElementById('address-select');

// --- Load Client Data ---
async function loadClientDashboard() {
    const clientId = getClientIdFromUrl();
    if (!clientId) {
        alert('שגיאה: לא נמצא מזהה לקוח.');
        return;
    }

    // שליפת נתוני לקוח מה-API
    const data = await fetchData({ action: 'getClientData', clientId });
    if (!data) return;

    // הצגת שם לקוח
    clientNameHome.textContent = data.clientName || 'לקוח';

    // הצגת הזמנות פעילות
    if (data.activeOrders && data.activeOrders.length > 0) {
        noActiveOrders.style.display = 'none';
        activeOrdersContainer.innerHTML = '';
        data.activeOrders.forEach(order => {
            const card = document.createElement('div');
            card.className = 'card status-card';
            card.innerHTML = `
                <div class="label">מספר הזמנה: ${order.orderId}</div>
                <div class="value">${order.type}</div>
                <div class="status-indicator status-color-${order.status}">
                    ${order.status}
                </div>
            `;
            activeOrdersContainer.appendChild(card);
        });
    } else {
        noActiveOrders.style.display = 'block';
    }

    // כתובות להזמנה חדשה
    addressSelect.innerHTML = '';
    (data.addresses || []).forEach(addr => {
        const opt = document.createElement('option');
        opt.value = addr;
        opt.textContent = addr;
        addressSelect.appendChild(opt);
    });

    // היסטוריית הזמנות
    historyTableBody.innerHTML = '';
    (data.history || []).forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${row.orderId}</td>
            <td>${new Date(row.date).toLocaleDateString('he-IL')}</td>
            <td>${row.type}</td>
            <td>${row.address}</td>
        `;
        historyTableBody.appendChild(tr);
    });

    // הודעות מוכנות בצ’אט
    chatTemplates.innerHTML = '';
    (data.chatTemplates || [
        'מה סטטוס ההזמנה שלי?',
        'תוך כמה זמן יגיע נהג?',
        'אני רוצה להחליף מכולה',
        'אני רוצה לפנות מכולה'
    ]).forEach(msg => {
        const btn = document.createElement('button');
        btn.className = 'template-btn';
        btn.textContent = msg;
        btn.onclick = () => sendChatMessage(msg);
        chatTemplates.appendChild(btn);
    });
}

// --- Orders ---
newOrderForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const clientId = getClientIdFromUrl();
    const type = document.getElementById('order-type').value;
    const address = document.getElementById('new-address').value || addressSelect.value;
    const notes = document.getElementById('order-notes').value;

    const result = await fetchData({
        action: 'createNewOrder',
        clientId,
        type,
        address,
        notes
    });

    if (result && result.status === 'success') {
        alert('ההזמנה נשלחה בהצלחה!');
        newOrderForm.reset();
        loadClientDashboard();
    }
});

// --- Chat ---
chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    sendChatMessage(chatMessage.value);
});

async function sendChatMessage(message) {
    const clientId = getClientIdFromUrl();
    const result = await fetchData({
        action: 'sendChatMessage',
        clientId,
        message
    });

    if (result && result.status === 'success') {
        alert('ההודעה נשלחה!');
        chatForm.reset();
    }
}

// --- Navigation ---
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.getElementById(btn.dataset.page).classList.add('active');
        btn.classList.add('active');
    });
});

// --- Init ---
document.addEventListener('DOMContentLoaded', loadClientDashboard);

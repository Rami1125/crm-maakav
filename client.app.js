/**
 * @file client.app.js
 * @description All client-side logic for the Saban CRM Client Portal Application.
 * This file manages state, API communication, and dynamic rendering of the mobile app interface.
 * Author: Gemini AI for Rami
 */

document.addEventListener('DOMContentLoaded', () => {
    // ========== STATE & CONFIG ==========
    const API_URL = "https://script.google.com/macros/s/AKfycbyyZHLsF9KDuRynsuNjweUHqVnNDZ9ZFIiDqRTT23aQSyJ98bCK4I6J1-EBMdNKrDvu/exec";
    
    const CHAT_TEMPLATES = [
        "המכולה מלאה, אשמח לתאם פינוי.",
        "צריך להחליף את המכולה במכולה ריקה.",
        "האם ניתן לקבל מכולה נוספת?",
        "מתי צפי הגעה של הנהג?",
        "תודה רבה על השירות המהיר!",
        "יש לי שאלה בנוגע לחיוב.",
        "האם ניתן להאריך את זמן השהייה של המכולה?",
        "עדכון כתובת - הפינוי יתבצע מכתובת אחרת.",
        "בקשה דחופה למכולה, אנא צרו קשר.",
        "הכל בסדר, רק רציתי לוודא שההזמנה התקבלה.",
    ];

    let clientState = {
        id: null,
        name: null,
        orders: [],
        addresses: new Set(),
        historyChart: null,
    };

    // ========== DOM ELEMENTS ==========
    const appContainer = document.querySelector('.app-container');
    const navButtons = document.querySelectorAll('.nav-btn');
    const pages = document.querySelectorAll('.page');
    
    const clientNameHome = document.getElementById('client-name-home');
    const activeOrdersContainer = document.getElementById('active-orders-container');
    const noActiveOrdersDiv = document.getElementById('no-active-orders');

    const orderForm = document.getElementById('new-order-form');
    const addressSelect = document.getElementById('address-select');
    
    const historyTableBody = document.getElementById('history-table-body');
    const historyChartCanvas = document.getElementById('historyChart');

    const chatTemplatesContainer = document.getElementById('chat-templates');
    const chatForm = document.getElementById('chat-form');


    // ========== CORE FUNCTIONS ==========

    /**
     * Main initialization function. Checks for a logged-in user or prompts for login.
     */
    function initApp() {
        setupEventListeners();
        const storedClientId = localStorage.getItem('saban_client_id');
        if (storedClientId) {
            loadClientData(storedClientId);
        } else {
            promptForClientId();
        }
    }

    /**
     * Fetches all necessary data for the logged-in client from the backend.
     * @param {string} clientId The client's ID.
     */
    async function loadClientData(clientId) {
        appContainer.style.opacity = '0.5'; // Visual feedback for loading
        try {
            const data = await apiGet(`getClientData?clientId=${clientId}`);
            if (!data || !data.clientName) {
                throw new Error("Client not found");
            }

            // Populate state
            clientState.id = clientId;
            clientState.name = data.clientName;
            clientState.orders = data.orders || [];
            clientState.addresses = new Set(data.orders.map(o => o['כתובת']).filter(Boolean));
            
            localStorage.setItem('saban_client_id', clientId);

            // Render all sections of the app
            renderHomePage();
            renderNewOrderPage();
            renderHistoryPage();
            renderChatPage();
            
        } catch (error) {
            console.error("Failed to load client data:", error);
            localStorage.removeItem('saban_client_id');
            alert("שגיאה בטעינת נתוני לקוח. אנא נסה שוב.");
            promptForClientId();
        } finally {
            appContainer.style.opacity = '1';
        }
    }
    
    /**
     * Generic function to fetch data from the Google Apps Script API.
     * @param {string} queryString The action and parameters for the GET request.
     */
    async function apiGet(queryString) {
        const response = await fetch(`${API_URL}?${queryString}`);
        if (!response.ok) throw new Error('Network response was not ok.');
        return await response.json();
    }
    
    /**
     * Generic function to post data to the Google Apps Script API.
     * @param {object} body The data payload to send.
     */
    async function apiPost(body) {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(body)
        });
        if (!response.ok) throw new Error('Network response was not ok.');
        return await response.json();
    }

    /**
     * Prompts the user to enter their client ID to log in.
     */
    function promptForClientId() {
        const clientId = prompt("שלום! אנא הזן את מספר הלקוח שלך כדי להתחבר:");
        if (clientId && clientId.trim() !== '') {
            loadClientData(clientId.trim());
        } else {
            document.body.innerHTML = `<div style="padding: 20px; text-align: center;"><h1>נדרש מספר לקוח. אנא רענן ונסה שוב.</h1></div>`;
        }
    }
    
    // ========== PAGE RENDERING ==========

    /**
     * Renders the content of the home page with active orders.
     */
    function renderHomePage() {
        clientNameHome.textContent = clientState.name;
        const activeOrders = clientState.orders.filter(o => o['סטטוס'] !== 'סגור');
        
        activeOrdersContainer.innerHTML = ''; // Clear previous orders

        if (activeOrders.length === 0) {
            noActiveOrdersDiv.style.display = 'block';
        } else {
            noActiveOrdersDiv.style.display = 'none';
            activeOrders.forEach(order => {
                const eta = order['זמן הגעה משוער'] || '';
                const status = order['סטטוס'] || 'מידע כללי';
                
                const card = document.createElement('div');
                card.className = 'card status-card';
                card.innerHTML = `
                    <p class="label">הזמנה פעילה (${order['מספר תעודה'] || 'N/A'})</p>
                    <p class="value">${order['סוג מכולה'] || 'מכולה'} בכתובת: ${order['כתובת']}</p>
                    <div class="status-indicator status-color-${status}">
                        <span>סטטוס: ${status}</span>
                        ${eta ? `<span class="eta-blinking">🚚 ${eta}</span>` : ''}
                    </div>
                `;
                activeOrdersContainer.appendChild(card);
            });
        }
    }
    
    /**
     * Populates the new order form with client-specific data (addresses).
     */
    function renderNewOrderPage() {
        addressSelect.innerHTML = '';
        clientState.addresses.forEach(address => {
            const option = document.createElement('option');
            option.value = address;
            option.textContent = address;
            addressSelect.appendChild(option);
        });
        const newAddressOption = document.createElement('option');
        newAddressOption.value = 'new';
        newAddressOption.textContent = 'כתובת חדשה...';
        addressSelect.appendChild(newAddressOption);
    }

    /**
     * Renders the history page with a chart and a table of past orders.
     */
    function renderHistoryPage() {
        historyTableBody.innerHTML = '';
        clientState.orders.forEach(order => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${order['מספר תעודה'] || ''}</td>
                <td>${new Date(order['תאריך']).toLocaleDateString('he-IL')}</td>
                <td>${order['סוג פעולה'] || 'הורדה'}</td>
                <td>${order['כתובת'] || ''}</td>
            `;
            historyTableBody.appendChild(row);
        });
        
        // Render Chart
        if(clientState.historyChart) clientState.historyChart.destroy();
        
        const monthlyData = clientState.orders.reduce((acc, order) => {
            const month = new Date(order['תאריך']).toLocaleDateString('he-IL', { year: '2-digit', month: 'short' });
            acc[month] = (acc[month] || 0) + 1;
            return acc;
        }, {});

        clientState.historyChart = new Chart(historyChartCanvas, {
            type: 'bar',
            data: {
                labels: Object.keys(monthlyData),
                datasets: [{
                    label: 'כמות הזמנות',
                    data: Object.values(monthlyData),
                    backgroundColor: 'var(--brand)',
                    borderRadius: 5
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } }
            }
        });
    }

    /**
     * Renders the chat page with predefined message templates.
     */
    function renderChatPage() {
        chatTemplatesContainer.innerHTML = '';
        CHAT_TEMPLATES.forEach(template => {
            const btn = document.createElement('button');
            btn.className = 'template-btn';
            btn.textContent = template;
            btn.onclick = () => sendChatMessage(template);
            chatTemplatesContainer.appendChild(btn);
        });
    }

    // ========== EVENT HANDLERS & SUBMISSIONS ==========

    /**
     * Sets up all the application's event listeners.
     */
    function setupEventListeners() {
        navButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                navigateTo(btn.dataset.page);
            });
        });
        
        orderForm.addEventListener('submit', handleNewOrderSubmit);
        chatForm.addEventListener('submit', handleChatSubmit);
    }
    
    /**
     * Handles the SPA navigation logic.
     * @param {string} pageId The ID of the page to display.
     */
    function navigateTo(pageId) {
        pages.forEach(p => p.classList.remove('active'));
        document.getElementById(pageId).classList.add('active');
        
        navButtons.forEach(b => b.classList.remove('active'));
        document.querySelector(`.nav-btn[data-page="${pageId}"]`).classList.add('active');
        
        appContainer.scrollTop = 0; // Scroll to top on page change
    }

    /**
     * Handles the submission of the new order form.
     */
    async function handleNewOrderSubmit(e) {
        e.preventDefault();
        const formData = new FormData(orderForm);
        const orderData = Object.fromEntries(formData.entries());

        // Use new address if provided, otherwise use the selected one
        const newAddress = document.getElementById('new-address').value.trim();
        if (newAddress) {
            orderData['כתובת'] = newAddress;
        } else if (orderData['כתובת'] === 'new') {
            alert("אנא בחר כתובת קיימת או הקלד כתובת חדשה.");
            return;
        }
        
        const payload = {
            action: 'clientRequest',
            clientId: clientState.id,
            clientName: clientState.name,
            requestType: orderData['סוג פעולה'],
            details: `כתובת: ${orderData['כתובת']}. הערות: ${orderData['הערות'] || 'אין'}`
        };
        
        try {
            const result = await apiPost(payload);
            if (result.status === 'success') {
                alert("בקשתך נשלחה בהצלחה! ניצור קשר בהקדם.");
                orderForm.reset();
                navigateTo('page-home');
            } else {
                throw new Error(result.message || 'Unknown error');
            }
        } catch (error) {
            alert(`שגיאה בשליחת הבקשה: ${error.message}`);
        }
    }
    
    /**
     * Handles sending a chat message (from template or free text).
     * @param {string} message The message content.
     */
    async function sendChatMessage(message) {
        if (!message || !message.trim()) return;

        const payload = {
            action: 'clientRequest',
            clientId: clientState.id,
            clientName: clientState.name,
            requestType: 'הודעת צאט',
            details: message
        };

        try {
            const result = await apiPost(payload);
            if (result.status === 'success') {
                showToast("הודעתך נשלחה!", "success");
            } else {
                throw new Error(result.message || 'Unknown error');
            }
        } catch (error) {
            showToast(`שגיאה בשליחת ההודעה: ${error.message}`, "error");
        }
    }

    /**
     * Handles the submission of the free-text chat form.
     */
    function handleChatSubmit(e) {
        e.preventDefault();
        const messageInput = document.getElementById('chat-message');
        sendChatMessage(messageInput.value);
        messageInput.value = '';
    }

    // ========== START APP ==========
    initApp();
});


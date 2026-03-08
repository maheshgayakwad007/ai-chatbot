// --- Global State ---
const chatBox = document.getElementById("chatBox");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const historyList = document.getElementById("historyList");
const welcomeScreen = document.getElementById("welcomeScreen");
const themeToggleBtn = document.getElementById("themeToggleBtn");
const sidebar = document.getElementById("sidebar");
const menuBtn = document.getElementById("menuBtn");
const closeSidebarBtn = document.getElementById("closeSidebarBtn");

let chats = [];
let currentChatId = null;

// --- Initialize App ---
function init() {
    loadHistory();
    setupTheme();
    setupEventListeners();

    if (chats.length === 0) {
        startNewChat();
    } else {
        selectChat(chats[0].id);
    }
}

function setupEventListeners() {
    menuBtn.onclick = () => sidebar.classList.add("active");
    closeSidebarBtn.onclick = () => sidebar.classList.remove("active");
    themeToggleBtn.onclick = toggleTheme;

    // Auto-resize textarea as you type
    userInput.oninput = function () {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 150) + 'px';
    };

    // Press Enter to send, Shift+Enter for new line
    userInput.onkeydown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };
}

// --- Theme Management ---
function setupTheme() {
    const saved = localStorage.getItem("chat-theme") || "dark";
    if (saved === "light") {
        document.body.setAttribute("data-theme", "light");
        themeToggleBtn.innerHTML = '<i class="fas fa-sun"></i>';
    }
}

function toggleTheme() {
    const isLight = document.body.getAttribute("data-theme") === "light";
    if (isLight) {
        document.body.removeAttribute("data-theme");
        localStorage.setItem("chat-theme", "dark");
        themeToggleBtn.innerHTML = '<i class="fas fa-moon"></i>';
    } else {
        document.body.setAttribute("data-theme", "light");
        localStorage.setItem("chat-theme", "light");
        themeToggleBtn.innerHTML = '<i class="fas fa-sun"></i>';
    }
}

// --- Chat & History Logic ---
function loadHistory() {
    const stored = localStorage.getItem("ai-chat-sessions");
    if (stored) {
        chats = JSON.parse(stored);
        renderHistoryList();
    }
}

function saveHistory() {
    localStorage.setItem("ai-chat-sessions", JSON.stringify(chats));
    renderHistoryList();
}

function startNewChat() {
    const newChat = {
        id: "chat_" + Date.now(),
        title: "New Chat",
        messages: []
    };
    chats.unshift(newChat);
    saveHistory();
    selectChat(newChat.id);
}

function selectChat(id) {
    currentChatId = id;
    renderChatArea();
    renderHistoryList();
    if (window.innerWidth < 800) sidebar.classList.remove("active");
}

function deleteCurrentChat() {
    if (!currentChatId) return;
    if (confirm("Delete this entire conversation?")) {
        chats = chats.filter(c => c.id !== currentChatId);
        saveHistory();
        if (chats.length > 0) selectChat(chats[0].id);
        else startNewChat();
    }
}

// --- View Rendering ---
function renderHistoryList() {
    historyList.innerHTML = "";
    chats.forEach(chat => {
        const item = document.createElement("div");
        item.className = `history-item ${chat.id === currentChatId ? 'active' : ''}`;
        item.innerHTML = `<i class="fas fa-message"></i> <span>${chat.title}</span>`;
        item.onclick = () => selectChat(chat.id);
        historyList.appendChild(item);
    });
}

function renderChatArea() {
    chatBox.innerHTML = "";
    const active = chats.find(c => c.id === currentChatId);

    if (!active || active.messages.length === 0) {
        // Show Welcome Screen
        chatBox.appendChild(welcomeScreen);
        welcomeScreen.style.display = "flex";
    } else {
        welcomeScreen.style.display = "none";
        active.messages.forEach(msg => {
            appendMessageUI(msg.content, msg.role);
        });
    }
    chatBox.scrollTop = chatBox.scrollHeight;
}

function appendMessageUI(text, role) {
    const wrap = document.createElement("div");
    wrap.className = `message-wrapper ${role}`;

    const msg = document.createElement("div");
    msg.className = `message ${role}`;

    // Use marked for AI responses (markdown)
    if (role === 'bot' && typeof marked !== 'undefined') {
        msg.innerHTML = marked.parse(text);
    } else {
        msg.textContent = text;
    }

    const time = document.createElement("div");
    time.className = "message-time";
    time.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    wrap.appendChild(msg);
    wrap.appendChild(time);
    chatBox.appendChild(wrap);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function showTyping() {
    const wrap = document.createElement("div");
    wrap.className = "message-wrapper bot";
    wrap.id = "typing-ui";
    wrap.innerHTML = `
        <div class="message bot">
            <div class="typing">
                <div class="dot-anim"></div>
                <div class="dot-anim"></div>
                <div class="dot-anim"></div>
            </div>
        </div>
    `;
    chatBox.appendChild(wrap);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function hideTyping() {
    const el = document.getElementById("typing-ui");
    if (el) el.remove();
}

// --- API Message Send ---
async function sendMessage() {
    const text = userInput.value.trim();
    if (!text) return;

    userInput.value = "";
    userInput.style.height = 'auto'; // Reset textarea size

    const active = chats.find(c => c.id === currentChatId);

    // Store user message
    active.messages.push({ role: "user", content: text });

    // Set dynamic title if first message
    if (active.messages.length === 1) {
        active.title = text.substring(0, 30) + (text.length > 30 ? "..." : "");
    }

    renderChatArea();
    showTyping();

    try {
        const response = await fetch("https://ai-chatbot-xxaw.onrender.com/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message: text,
                messages: active.messages.map(m => ({
                    role: m.role === 'bot' ? 'assistant' : m.role,
                    content: m.content
                }))
            })
        });

        const data = await response.json();
        hideTyping();

        const botText = data.reply || "Sorry, I received an empty response.";
        active.messages.push({ role: "bot", content: botText });

        saveHistory();
        renderChatArea();

    } catch (err) {
        hideTyping();
        console.error(err);
        appendMessageUI("Communication error. Please check your internet or server.", "bot");
    }
}

// Start Application
init();
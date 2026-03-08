// --- Constants & State ---
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

// --- Initialization ---
function init() {
    loadChats();
    setupTheme();
    setupEventListeners();

    // Auto-select or create first chat
    if (chats.length === 0) {
        startNewChat();
    } else {
        selectChat(chats[0].id);
    }
}

function setupEventListeners() {
    menuBtn.addEventListener("click", () => sidebar.classList.add("active"));
    closeSidebarBtn.addEventListener("click", () => sidebar.classList.remove("active"));
    themeToggleBtn.addEventListener("click", toggleTheme);

    // Auto-resize textarea
    userInput.addEventListener("input", function () {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 200) + 'px';
    });

    userInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
}

// --- Theme Management ---
function setupTheme() {
    const savedTheme = localStorage.getItem("nebula-theme") || "dark";
    if (savedTheme === "light") {
        document.body.setAttribute("data-theme", "light");
        themeToggleBtn.innerHTML = '<i class="fas fa-sun"></i>';
    }
}

function toggleTheme() {
    const current = document.body.getAttribute("data-theme");
    if (current === "light") {
        document.body.removeAttribute("data-theme");
        localStorage.setItem("nebula-theme", "dark");
        themeToggleBtn.innerHTML = '<i class="fas fa-moon"></i>';
    } else {
        document.body.setAttribute("data-theme", "light");
        localStorage.setItem("nebula-theme", "light");
        themeToggleBtn.innerHTML = '<i class="fas fa-sun"></i>';
    }
}

// --- Chat Core Logic ---
function loadChats() {
    const stored = localStorage.getItem("nebula-chats");
    if (stored) {
        chats = JSON.parse(stored);
        renderHistory();
    }
}

function saveChats() {
    localStorage.setItem("nebula-chats", JSON.stringify(chats));
    renderHistory();
}

function startNewChat() {
    const newChat = {
        id: Date.now().toString(),
        title: "New Transmission",
        messages: []
    };
    chats.unshift(newChat);
    saveChats();
    selectChat(newChat.id);
}

function selectChat(id) {
    currentChatId = id;
    renderChatArea();
    renderHistory();
    if (window.innerWidth < 850) sidebar.classList.remove("active");
}

function deleteCurrentChat() {
    if (!currentChatId) return;
    if (confirm("Erase this transmission folder?")) {
        chats = chats.filter(c => c.id !== currentChatId);
        saveChats();
        if (chats.length > 0) selectChat(chats[0].id);
        else startNewChat();
    }
}

function usePrompt(text) {
    userInput.value = text;
    userInput.style.height = 'auto';
    sendMessage();
}

// --- UI Rendering ---
function renderHistory() {
    historyList.innerHTML = "";
    chats.forEach(chat => {
        const item = document.createElement("div");
        item.className = `history-item ${chat.id === currentChatId ? 'active' : ''}`;
        item.innerHTML = `<i class="fas fa-comment-dots"></i> <span>${chat.title}</span>`;
        item.onclick = () => selectChat(chat.id);
        historyList.appendChild(item);
    });
}

function renderChatArea() {
    chatBox.innerHTML = "";
    const active = chats.find(c => c.id === currentChatId);

    if (!active || active.messages.length === 0) {
        chatBox.innerHTML = `
            <div class="welcome-hero" id="welcomeScreen">
                <div class="hero-icon">
                    <i class="fas fa-meteor"></i>
                </div>
                <h2>Dimension: Neural</h2>
                <p>Establishing digital uplink... Ready for interaction.</p>
                <div class="suggested-prompts">
                    <button onclick="usePrompt('Future of Space Travel')">Space Hub 🪐</button>
                    <button onclick="usePrompt('How to code in Python?')">Python Core 🐍</button>
                </div>
            </div>
        `;
    } else {
        active.messages.forEach(msg => {
            appendMessage(msg.content, msg.role, false);
        });
    }
    scrollToBottom();
}

function appendMessage(text, role, animate = true) {
    const wrapper = document.createElement("div");
    wrapper.className = `message-wrapper ${role}`;

    const msgDiv = document.createElement("div");
    msgDiv.className = `message ${role}`;

    if (role === 'bot' && typeof marked !== 'undefined') {
        msgDiv.innerHTML = marked.parse(text);
    } else {
        msgDiv.textContent = text;
    }

    const time = document.createElement("div");
    time.className = "message-time";
    time.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    wrapper.appendChild(msgDiv);
    wrapper.appendChild(time);
    chatBox.appendChild(wrapper);
    scrollToBottom();
}

function showTyping() {
    const wrapper = document.createElement("div");
    wrapper.className = "message-wrapper bot";
    wrapper.id = "typingIndicator";

    const msgDiv = document.createElement("div");
    msgDiv.className = "message bot";
    msgDiv.innerHTML = `
        <div class="typing-dots">
            <div class="dot"></div>
            <div class="dot"></div>
            <div class="dot"></div>
        </div>
    `;

    wrapper.appendChild(msgDiv);
    chatBox.appendChild(wrapper);
    scrollToBottom();
}

function removeTyping() {
    const el = document.getElementById("typingIndicator");
    if (el) el.remove();
}

function scrollToBottom() {
    chatBox.scrollTop = chatBox.scrollHeight;
}

// --- API Communication ---
async function sendMessage() {
    const text = userInput.value.trim();
    if (!text) return;

    userInput.value = "";
    userInput.style.height = 'auto';

    const active = chats.find(c => c.id === currentChatId);

    // Add user message to state
    active.messages.push({ role: "user", content: text });

    // Dynamic Title
    if (active.messages.length === 1) {
        active.title = text.substring(0, 25) + "...";
    }

    saveChats();
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
        removeTyping();

        const botMsg = data.reply || "Transmission failed... System offline.";
        active.messages.push({ role: "bot", content: botMsg });

        saveChats();
        renderChatArea();

    } catch (err) {
        removeTyping();
        console.error(err);
        appendMessage("Critical Error: Connection lost with Nebula server.", "bot");
    }
}

// --- Start ---
init();
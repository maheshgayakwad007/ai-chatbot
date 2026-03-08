// --- App Engine Configuration ---
const chatBox = document.getElementById("chatBox");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const historyList = document.getElementById("historyList");
const welcomeScreen = document.getElementById("welcomeScreen");
const themeToggleBtn = document.getElementById("themeToggleBtn");
const sidebar = document.getElementById("sidebar");
const menuBtn = document.getElementById("menuBtn");
const closeSidebarBtn = document.getElementById("closeSidebarBtn");

let chatSessions = [];
let currentId = null;

// --- Initialize Core ---
function init() {
    loadSessions();
    applyTheme();
    bindEvents();

    if (chatSessions.length === 0) {
        startNewChat();
    } else {
        switchToChat(chatSessions[0].id);
    }
}

function bindEvents() {
    menuBtn.addEventListener("click", () => sidebar.classList.add("active"));
    closeSidebarBtn.addEventListener("click", () => sidebar.classList.remove("active"));
    themeToggleBtn.addEventListener("click", toggleTheme);

    // Smooth Input Auto-scaling
    userInput.addEventListener("input", function () {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 180) + 'px';
    });

    userInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
}

// --- Theme Shifting ---
function applyTheme() {
    const theme = localStorage.getItem("app-theme") || "dark";
    if (theme === "light") {
        document.body.setAttribute("data-theme", "light");
        themeToggleBtn.innerHTML = '<i class="fas fa-sun"></i>';
    }
}

function toggleTheme() {
    const isLight = document.body.getAttribute("data-theme") === "light";
    if (isLight) {
        document.body.removeAttribute("data-theme");
        localStorage.setItem("app-theme", "dark");
        themeToggleBtn.innerHTML = '<i class="fas fa-moon"></i>';
    } else {
        document.body.setAttribute("data-theme", "light");
        localStorage.setItem("app-theme", "light");
        themeToggleBtn.innerHTML = '<i class="fas fa-sun"></i>';
    }
}

// --- State Management ---
function loadSessions() {
    const raw = localStorage.getItem("nebula-chat-vault");
    if (raw) {
        chatSessions = JSON.parse(raw);
        renderHistory();
    }
}

function saveSessions() {
    localStorage.setItem("nebula-chat-vault", JSON.stringify(chatSessions));
    renderHistory();
}

function startNewChat() {
    const newSession = {
        id: "session_" + Date.now(),
        title: "New Conversation",
        messages: []
    };
    chatSessions.unshift(newSession);
    saveSessions();
    switchToChat(newSession.id);
}

function switchToChat(id) {
    currentId = id;
    renderChatArea();
    renderHistory();
    if (window.innerWidth < 850) sidebar.classList.remove("active");
}

function deleteCurrentChat() {
    if (!currentId) return;
    if (confirm("Permanently erase this conversation thread?")) {
        chatSessions = chatSessions.filter(s => s.id !== currentId);
        saveSessions();
        if (chatSessions.length > 0) switchToChat(chatSessions[0].id);
        else startNewChat();
    }
}

function usePrompt(text) {
    userInput.value = text;
    userInput.dispatchEvent(new Event('input'));
    sendMessage();
}

// --- View Rendering ---
function renderHistory() {
    historyList.innerHTML = "";
    chatSessions.forEach(session => {
        const div = document.createElement("div");
        div.className = `history-item ${session.id === currentId ? 'active' : ''}`;
        div.innerHTML = `<i class="fas fa-comment-nodes"></i> <span>${session.title}</span>`;
        div.onclick = () => switchToChat(session.id);
        historyList.appendChild(div);
    });
}

function renderChatArea() {
    chatBox.innerHTML = "";
    const active = chatSessions.find(s => s.id === currentId);

    if (!active || active.messages.length === 0) {
        chatBox.appendChild(welcomeScreen);
        welcomeScreen.style.display = "flex";
    } else {
        welcomeScreen.style.display = "none";
        active.messages.forEach(m => injectMessageUI(m.content, m.role));
    }
    chatBox.scrollTop = chatBox.scrollHeight;
}

function injectMessageUI(text, role) {
    const wrap = document.createElement("div");
    wrap.className = `message-wrapper ${role}`;

    const div = document.createElement("div");
    div.className = `message ${role}`;

    if (role === 'bot' && typeof marked !== 'undefined') {
        div.innerHTML = marked.parse(text);
    } else {
        div.textContent = text;
    }

    const t = document.createElement("div");
    t.className = "message-time";
    t.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    wrap.appendChild(div);
    wrap.appendChild(t);
    chatBox.appendChild(wrap);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function showTypingIndicator() {
    const wrap = document.createElement("div");
    wrap.className = "message-wrapper bot";
    wrap.id = "ui-typing";
    wrap.innerHTML = `
        <div class="message bot">
            <div class="typing-container">
                <div class="t-dot"></div>
                <div class="t-dot"></div>
                <div class="t-dot"></div>
            </div>
        </div>
    `;
    chatBox.appendChild(wrap);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function hideTypingIndicator() {
    const el = document.getElementById("ui-typing");
    if (el) el.remove();
}

// --- Communication ---
async function sendMessage() {
    const content = userInput.value.trim();
    if (!content) return;

    userInput.value = "";
    userInput.style.height = 'auto';

    const active = chatSessions.find(s => s.id === currentId);

    // Store User Logic
    active.messages.push({ role: "user", content });

    // Update Title on First Msg
    if (active.messages.length === 1) {
        active.title = content.substring(0, 25) + (content.length > 25 ? "..." : "");
    }

    renderChatArea();
    showTypingIndicator();

    try {
        const response = await fetch("https://ai-chatbot-xxaw.onrender.com/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message: content,
                messages: active.messages.map(m => ({
                    role: m.role === 'bot' ? 'assistant' : m.role,
                    content: m.content
                }))
            })
        });

        const data = await response.json();
        hideTypingIndicator();

        const reply = data.reply || "Connection interrupted. Attempting to restore...";
        active.messages.push({ role: "bot", content: reply });

        saveSessions();
        renderChatArea();

    } catch (err) {
        hideTypingIndicator();
        console.error(err);
        injectMessageUI("System Alert: Neural link unstable. Please retry your transmission.", "bot");
    }
}

// Boot
init();
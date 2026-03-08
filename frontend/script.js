// Initialize Elements
const chatBox = document.getElementById("chatBox");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const historyList = document.getElementById("historyList");
const welcomeScreen = document.getElementById("welcomeScreen");
const sidebar = document.getElementById("sidebar");
const menuBtn = document.getElementById("menuBtn");
const closeSidebarBtn = document.getElementById("closeSidebarBtn");

// State
let chats = [];
let currentChatId = null;

// Initialize
function init() {
    loadChats();
    setupEventListeners();

    if (chats.length === 0) {
        startNewChat();
    } else {
        selectChat(chats[0].id);
    }
}

// Event Listeners
function setupEventListeners() {
    menuBtn.addEventListener("click", () => sidebar.classList.add("active"));
    closeSidebarBtn.addEventListener("click", () => sidebar.classList.remove("active"));

    // Auto-resize textarea handling
    userInput.addEventListener("input", function () {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 150) + 'px';
        if (this.value.trim() === "") {
            sendBtn.disabled = true;
        } else {
            sendBtn.disabled = false;
        }
    });

    // Handle shift+enter for new line, enter for send
    userInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
}

// Chat Management
function loadChats() {
    const savedChats = localStorage.getItem("aiChats");
    if (savedChats) {
        chats = JSON.parse(savedChats);
        renderHistoryList();
    }
}

function saveChats() {
    localStorage.setItem("aiChats", JSON.stringify(chats));
    renderHistoryList();
}

function generateId() {
    return Math.random().toString(36).substr(2, 9);
}

function startNewChat() {
    const newChat = {
        id: generateId(),
        title: "New Conversation",
        messages: []
    };
    chats.unshift(newChat);
    saveChats();
    selectChat(newChat.id);

    // On mobile, close sidebar after clicking new chat
    if (window.innerWidth <= 768) {
        sidebar.classList.remove("active");
    }
}

function selectChat(id) {
    currentChatId = id;
    renderHistoryList();
    renderChatBox();

    // On mobile, close sidebar after selecting chat
    if (window.innerWidth <= 768) {
        sidebar.classList.remove("active");
    }
}

function deleteCurrentChat() {
    if (!currentChatId) return;

    if (confirm("Are you sure you want to delete this conversation?")) {
        chats = chats.filter(chat => chat.id !== currentChatId);
        saveChats();

        if (chats.length > 0) {
            selectChat(chats[0].id);
        } else {
            startNewChat();
        }
    }
}

// Render UI
function renderHistoryList() {
    historyList.innerHTML = "";
    chats.forEach(chat => {
        const item = document.createElement("div");
        item.className = `history-item ${chat.id === currentChatId ? 'active' : ''}`;
        item.onclick = () => selectChat(chat.id);
        item.innerHTML = `<i class="fas fa-message"></i> <span>${chat.title}</span>`;
        historyList.appendChild(item);
    });
}

function renderChatBox() {
    chatBox.innerHTML = "";
    const currentChat = chats.find(c => c.id === currentChatId);

    if (!currentChat || currentChat.messages.length === 0) {
        chatBox.appendChild(welcomeScreen);
        welcomeScreen.style.display = "flex";
    } else {
        welcomeScreen.style.display = "none";
        currentChat.messages.forEach(msg => {
            appendMessageUI(msg.content, msg.role, false);
        });
        scrollToBottom();
    }
}

function appendMessageUI(text, role, animate = true) {
    const wrapper = document.createElement("div");
    wrapper.className = `message-wrapper ${role === 'user' ? 'user' : 'bot'}`;
    if (!animate) {
        wrapper.style.animation = 'none';
    }

    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${role === 'user' ? 'user' : 'bot'}`;

    if (role === 'bot') {
        // Use marked if available for markdown processing
        if (typeof marked !== 'undefined') {
            messageDiv.innerHTML = marked.parse(text);
        } else {
            messageDiv.textContent = text;
        }
    } else {
        messageDiv.textContent = text;
    }

    const timeDiv = document.createElement("div");
    timeDiv.className = "message-time";
    const now = new Date();
    timeDiv.textContent = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    wrapper.appendChild(messageDiv);
    wrapper.appendChild(timeDiv);
    chatBox.appendChild(wrapper);
    scrollToBottom();
}

function showTypingIndicator() {
    const wrapper = document.createElement("div");
    wrapper.className = `message-wrapper bot`;
    wrapper.id = "typingIndicator";

    const messageDiv = document.createElement("div");
    messageDiv.className = `message bot`;

    const typingIndicator = document.createElement("div");
    typingIndicator.className = "typing-indicator";
    typingIndicator.innerHTML = '<div class="dot"></div><div class="dot"></div><div class="dot"></div>';

    messageDiv.appendChild(typingIndicator);
    wrapper.appendChild(messageDiv);
    chatBox.appendChild(wrapper);
    scrollToBottom();
}

function removeTypingIndicator() {
    const indicator = document.getElementById("typingIndicator");
    if (indicator) {
        indicator.remove();
    }
}

function scrollToBottom() {
    chatBox.scrollTop = chatBox.scrollHeight;
}

// Messaging
async function sendMessage() {
    const text = userInput.value.trim();
    if (!text) return;

    userInput.value = "";
    userInput.style.height = 'auto'; // Reset size
    sendBtn.disabled = true;

    if (welcomeScreen.style.display !== "none") {
        welcomeScreen.style.display = "none";
    }

    const currentChat = chats.find(c => c.id === currentChatId);

    // Add User Message
    const userMessage = { role: "user", content: text };
    currentChat.messages.push(userMessage);

    // Update title if first message
    if (currentChat.messages.length === 1) {
        currentChat.title = text.substring(0, 30) + (text.length > 30 ? "..." : "");
    }

    saveChats();
    appendMessageUI(text, "user");

    // Show typing
    showTypingIndicator();

    try {
        // Build context to send
        const apiMessages = currentChat.messages.map(m => ({
            role: m.role === 'bot' ? 'assistant' : m.role,
            content: m.content
        }));

        let responseText = "Server response";
        const res = await fetch("https://ai-chatbot-xxaw.onrender.com/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: text,
                messages: apiMessages
            })
        });

        const data = await res.json();
        responseText = data.reply || "No response received";

        removeTypingIndicator();

        const botMessage = { role: "bot", content: responseText };
        currentChat.messages.push(botMessage);

        // Save chats before rendering completely ensuring state is synced
        saveChats();

        appendMessageUI(responseText, "bot");

    } catch (error) {
        removeTypingIndicator();
        console.error(error);
        const errorMsg = "Sorry, there was an error communicating with the server. Please try again later.";
        currentChat.messages.push({ role: "bot", content: errorMsg });
        saveChats();
        appendMessageUI(errorMsg, "bot");
    }
}

// Run init
init();

// Set initial textarea state
userInput.dispatchEvent(new Event('input'));
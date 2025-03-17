document.addEventListener('DOMContentLoaded', () => {
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    const chatMessages = document.getElementById('chat-messages');
    const darkModeSwitch = document.getElementById('dark-mode-switch');
    const body = document.body;
    const clearChatButton = document.getElementById('clear-chat-button');
    const typingIndicator = document.getElementById('typing-indicator');

    let apiKey = localStorage.getItem('geminiApiKey');
    let geminiApiUrl;

    function initializeApi() {
        if (!apiKey) {
            apiKey = prompt('Por favor, introduce tu API key de Gemini:');
            if (apiKey) {
                localStorage.setItem('geminiApiKey', apiKey);
            } else {
                alert('Necesitas proporcionar una API key de Gemini para usar el chat.');
                sendButton.disabled = true;
                messageInput.disabled = true;
                return false;
            }
        }

        geminiApiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + apiKey;
        sendButton.disabled = false;
        messageInput.disabled = false;
        return true;
    }

    if (!initializeApi()) {
        return;
    }


    const geminiInstruction = "Actúa como un asistente de cocina experto, proporcionando recetas, consejos de preparación, sugerencias de ingredientes alternativos, y ayudando con técnicas culinarias, manteniéndote siempre en el rol de ayudante de cocina sin desviarte de ese contexto.";

    let conversationHistory = JSON.parse(localStorage.getItem('geminiChatHistory')) || [];

    conversationHistory.forEach(message => {
        if (message.role === 'user') {
            displayUserMessage(message.parts[0].text, false);
        } else if (message.role === 'model') {
            displayGeminiMessage(message.parts[0].text, false);
        }
    });
    scrollToBottom();

    sendButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    });

    darkModeSwitch.addEventListener('change', () => {
        body.classList.toggle('dark-mode');
        if (body.classList.contains('dark-mode')) {
            localStorage.setItem('dark-mode', 'enabled');
        } else {
            localStorage.removeItem('dark-mode');
        }
    });

    if (localStorage.getItem('dark-mode') === 'enabled') {
        body.classList.add('dark-mode');
        darkModeSwitch.checked = true;
    }

    if (conversationHistory.length === 0) {
        displayGeminiMessage("¡Hola! Soy Gemini, tu asistente personal. ¿En qué puedo ayudarte hoy?");
        conversationHistory.push({ role: "model", parts: [{ text: "¡Hola! Soy Gemini, tu asistente personal. ¿En qué puedo ayudarte hoy?" }] });
        saveConversationHistory();
    }


    function sendMessage() {
        const messageText = messageInput.value.trim();
        if (!messageText) return;

        if (messageText === '/limpiar') {
            clearChat();
            return;
        }

        displayUserMessage(messageText);
        messageInput.value = '';
        messageInput.style.height = 'auto';

        conversationHistory.push({ role: "user", parts: [{ text: messageText }] });
        saveConversationHistory();

        typingIndicator.style.display = 'block';
        scrollToBottom();

        callGeminiAPI(conversationHistory, geminiInstruction);
    }


    function displayUserMessage(message, doScroll = true) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', 'user-message');
        messageElement.textContent = message;
        chatMessages.appendChild(messageElement);
        if (doScroll) scrollToBottom();
    }

    function displayGeminiMessage(message, doScroll = true) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', 'gemini-message');
    
        const maxLength = 500;
        if (message.length > maxLength) {
            const shortMessage = message.substring(0, maxLength) + '... ';
            const seeMoreSpan = document.createElement('span');
            seeMoreSpan.textContent = 'Ver más';
            seeMoreSpan.classList.add('see-more-link');
            seeMoreSpan.style.cursor = 'pointer';
            seeMoreSpan.onclick = () => {
                // Mensaje completo con saltos de línea HTML forzados para prueba
                messageElement.innerHTML = message.replace(/\n/g, '<br>');
                scrollToBottom();
            };
            // Mensaje corto inicial con saltos de línea HTML forzados para prueba
            messageElement.innerHTML = shortMessage.replace(/\n/g, '<br>');
            messageElement.appendChild(seeMoreSpan);
        } else {
            // Mensaje completo con saltos de línea HTML forzados para prueba
            messageElement.innerHTML = message.replace(/\n/g, '<br>');
        }
    
        chatMessages.appendChild(messageElement);
        if (doScroll) scrollToBottom();
    }


    function callGeminiAPI(history, instruction) {
        const apiContents = [
            {
                role: "user",
                parts: [{ text: instruction }]
            },
            ...history
        ];


        fetch(geminiApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: apiContents
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Error en la API de Gemini: ${response.status} ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            console.log("Respuesta de la API de Gemini:", data);
            if (data.candidates && data.candidates[0].content.parts[0].text) {
                const geminiResponse = data.candidates[0].content.parts[0].text;

                setTimeout(() => {
                    typingIndicator.style.display = 'none';
                    displayGeminiMessage(geminiResponse);
                    conversationHistory.push({ role: "model", parts: [{ text: geminiResponse }] });
                    saveConversationHistory();
                }, 500);

            } else {
                typingIndicator.style.display = 'none';
                displayGeminiMessage("No se pudo obtener una respuesta clara de Gemini.");
                console.error("Respuesta de Gemini incompleta:", data);
            }
        })
        .catch(error => {
            console.error("Error al llamar a la API de Gemini:", error);
            typingIndicator.style.display = 'none';
            displayGeminiMessage("Error al comunicarse con Gemini. Inténtalo de nuevo más tarde.");
            localStorage.removeItem('geminiApiKey');
            apiKey = null;
            initializeApi();
        });
    }

    function scrollToBottom() {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    messageInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });

    function saveConversationHistory() {
        localStorage.setItem('geminiChatHistory', JSON.stringify(conversationHistory));
    }

    function clearChat() {
        conversationHistory = [];
        localStorage.removeItem('geminiChatHistory');
        chatMessages.innerHTML = '';
        displayGeminiMessage("Chat limpiado.");
        conversationHistory.push({ role: "model", parts: [{ text: "Chat limpiado." }] });
        saveConversationHistory();
    }

    clearChatButton.addEventListener('click', clearChat);
});
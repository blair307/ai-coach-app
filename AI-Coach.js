// AI Coach JavaScript
class AICoach {
    constructor() {
        this.messages = [];
        this.isTyping = false;
        this.settings = this.loadSettings();
        this.init();
    }

    init() {
        this.updateBranding();
        this.setupEventListeners();
        this.loadConversationHistory();
    }

    updateBranding() {
        document.title = 'AI Coach - Entrepreneur Emotional Health';
        const brandElements = document.querySelectorAll('.sidebar-header h2');
        brandElements.forEach(el => {
            if (el.textContent === 'AI Coach') {
                el.textContent = 'EEH';
            }
        });
    }

    setupEventListeners() {
        const messageInput = document.getElementById('messageInput');
        const sendButton = document.getElementById('sendButton');

        if (messageInput) {
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });

            // Auto-resize textarea
            messageInput.addEventListener('input', this.autoResizeTextarea);
        }

        if (sendButton) {
            sendButton.addEventListener('click', () => this.sendMessage());
        }
    }

    autoResizeTextarea(e) {
        e.target.style.height = 'auto';
        e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
    }

    loadConversationHistory() {
        const saved = localStorage.getItem('eeh_coach_conversation');
        if (saved) {
            this.messages = JSON.parse(saved);
            this.renderMessages();
        }
    }

    saveConversation() {
        localStorage.setItem('eeh_coach_conversation', JSON.stringify(this.messages));
    }

    sendMessage() {
        const messageInput = document.getElementById('messageInput');
        const content = messageInput.value.trim();

        if (!content || this.isTyping) return;

        // Add user message
        const userMessage = {
            id: Date.now(),
            type: 'user',
            content: content,
            timestamp: new Date()
        };

        this.messages.push(userMessage);
        messageInput.value = '';
        messageInput.style.height = 'auto';

        this.renderMessages();
        this.saveConversation();

        // Show typing indicator and get AI response
        this.showTypingIndicator();
        setTimeout(() => {
            this.getAIResponse(content);
        }, 1500 + Math.random() * 2000); // Random delay 1.5-3.5s
    }

    renderMessages() {
        const container = document.getElementById('chatMessages');
        if (!container) return;

        // Keep the welcome message and add conversation messages
        const welcomeMessage = `
            <div class="message-content" style="background: var(--surface); padding: 1.5rem; border-radius: var(--radius-lg); margin-bottom: 1.5rem; border-left: 3px solid var(--primary); max-width: 80%;">
                <div style="color: var(--text-primary); line-height: 1.6; margin-bottom: 0.5rem;">
                    Welcome! I'm your AI Emotional Health Coach, specialized in helping entrepreneurs manage stress, build emotional intelligence, and achieve work-life balance. 
                    
                    How are you feeling today? What challenges would you like to work on?
                </div>
                <div style="color: var(--text-muted); font-size: 0.875rem;">Just now</div>
            </div>
        `;

        const conversationMessages = this.messages.map(message => {
            if (message.type === 'user') {
                return `
                    <div style="display: flex; justify-content: flex-end; margin-bottom: 1.5rem;">
                        <div class="message-content" style="background: var(--primary); color: white; padding: 1rem 1.5rem; border-radius: var(--radius-lg); max-width: 70%;">
                            <div style="line-height: 1.6; margin-bottom: 0.5rem;">${this.escapeHtml(message.content)}</div>
                            <div style="opacity: 0.8; font-size: 0.875rem;">${this.formatTimestamp(message.timestamp)}</div>
                        </div>
                    </div>
                `;
            } else {
                return `
                    <div style="display: flex; justify-content: flex-start; margin-bottom: 1.5rem;">
                        <div class="message-content" style="background: var(--surface); padding: 1.5rem; border-radius: var(--radius-lg); border-left: 3px solid var(--primary); max-width: 80%;">
                            <div style="color: var(--text-primary); line-height: 1.6; margin-bottom: 0.5rem;">${this.escapeHtml(message.content)}</div>
                            <div style="color: var(--text-muted); font-size: 0.875rem;">${this.formatTimestamp(message.timestamp)}</div>
                        </div>
                    </div>
                `;
            }
        }).join('');

        container.innerHTML = welcomeMessage + conversationMessages;
        container.scrollTop = container.scrollHeight;
    }

    showTypingIndicator() {
        this.isTyping = true;
        const indicator = document.getElementById('typingIndicator');
        if (indicator) {
            indicator.style.display = 'flex';
        }
    }

    hideTypingIndicator() {
        this.isTyping = false;
        const indicator = document.getElementById('typingIndicator');
        if (indicator) {
            indicator.style.display = 'none';
        }
    }

    getAIResponse(userMessage) {
        // Simulate AI response (in real app, this would call OpenAI API)
        const responses = this.generateContextualResponse(userMessage);
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];

        const aiMessage = {
            id: Date.now(),
            type: 'ai',
            content: randomResponse,
            timestamp: new Date()
        };

        this.messages.push(aiMessage);
        this.hideTypingIndicator();
        this.renderMessages();
        this.saveConversation();
    }

    generateContextualResponse(userMessage) {
        const message = userMessage.toLowerCase();
        
        if (message.includes('stress') || message.includes('overwhelm')) {
            return [
                "I understand that stress can feel overwhelming, especially as an entrepreneur. Let's work on some strategies to help you manage it. What specific situations trigger your stress the most?",
                "Stress is a common challenge for entrepreneurs. One effective technique is the 4-7-8 breathing method. Would you like me to guide you through it?",
                "It sounds like you're dealing with a lot right now. Remember that stress is often a signal that we need to pause and reassess. What's the most pressing thing on your mind today?"
            ];
        }
        
        if (message.includes('team') || message.includes('employee') || message.includes('leadership')) {
            return [
                "Leadership challenges are part of every entrepreneur's journey. What specific team dynamics are you finding difficult right now?",
                "Building a strong team requires emotional intelligence and clear communication. Can you tell me more about what's happening with your team?",
                "Great leaders know when to listen and when to act. What kind of leadership challenge are you facing?"
            ];
        }
        
        if (message.includes('goal') || message.includes('planning') || message.includes('future')) {
            return [
                "Setting meaningful goals is crucial for entrepreneurial success. What goals are you working toward right now?",
                "I'd love to help you clarify your goals. What does success look like for you in the next 3-6 months?",
                "Goal setting is both an art and a science. Let's break down what you want to achieve into manageable steps."
            ];
        }
        
        if (message.includes('balance') || message.includes('life') || message.includes('personal')) {
            return [
                "Work-life balance is especially challenging for entrepreneurs who are passionate about their vision. How are you currently managing the boundaries between work and personal time?",
                "Finding balance doesn't mean perfect equality—it means being intentional about your energy and time. What areas of your life feel out of balance right now?",
                "As an entrepreneur, you're likely used to putting your business first. But taking care of yourself is essential for long-term success. What does self-care look like for you?"
            ];
        }
        
        // Default responses
        return [
            "Thank you for sharing that with me. As an entrepreneur, you face unique challenges that require both emotional resilience and practical strategies. Can you tell me more about what's on your mind?",
            "I appreciate you opening up. Every entrepreneur's journey is different, and it's important to acknowledge both the struggles and the growth. What would be most helpful to focus on right now?",
            "What you're experiencing is very common among entrepreneurs. The combination of pressure, uncertainty, and responsibility can be intense. How can I best support you through this?",
            "I'm here to help you navigate both the emotional and practical aspects of entrepreneurship. What feels like the biggest challenge you're facing today?"
        ];
    }

    // Quick topic handlers
    quickTopic(topic) {
        const topicPrompts = {
            stress: "I'd like to work on stress management techniques.",
            leadership: "I need help with leadership and team management.",
            burnout: "I'm concerned about preventing burnout.",
            communication: "I want to improve my team communication skills.",
            decision: "I need guidance on making difficult business decisions.",
            confidence: "I'd like to work on building my confidence as a leader."
        };

        const messageInput = document.getElementById('messageInput');
        if (messageInput && topicPrompts[topic]) {
            messageInput.value = topicPrompts[topic];
            messageInput.focus();
        }
    }

    // Settings functionality
    toggleSettings() {
        const modal = this.createSettingsModal();
        document.body.appendChild(modal);
    }

    createSettingsModal() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>AI Coach Settings</h3>
                    <button class="close-btn" onclick="this.closest('.modal').remove()">×</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>
                            <input type="checkbox" ${this.settings.longResponses ? 'checked' : ''}> 
                            Detailed responses
                        </label>
                        <small>Get more comprehensive guidance and explanations</small>
                    </div>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" ${this.settings.emotionalFocus ? 'checked' : ''}> 
                            Focus on emotional wellness
                        </label>
                        <small>Prioritize emotional intelligence and mental health topics</small>
                    </div>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" ${this.settings.businessFocus ? 'checked' : ''}> 
                            Include business strategy
                        </label>
                        <small>Include practical business advice with emotional guidance</small>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
                    <button class="btn btn-primary" onclick="window.aiCoach.saveSettings(this.closest('.modal'))">Save Settings</button>
                </div>
            </div>
        `;

        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });

        return modal;
    }

    saveSettings(modal) {
        const checkboxes = modal.querySelectorAll('input[type="checkbox"]');
        this.settings = {
            longResponses: checkboxes[0].checked,
            emotionalFocus: checkboxes[1].checked,
            businessFocus: checkboxes[2].checked
        };
        
        localStorage.setItem('eeh_coach_settings', JSON.stringify(this.settings));
        modal.remove();
        this.showToast('Settings saved successfully!');
    }

    loadSettings() {
        const saved = localStorage.getItem('eeh_coach_settings');
        return saved ? JSON.parse(saved) : {
            longResponses: true,
            emotionalFocus: true,
            businessFocus: true
        };
    }

    // Utility functions
    formatTimestamp(date) {
        return new Date(date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showToast(message) {
        const existingToasts = document.querySelectorAll('.toast-notification');
        existingToasts.forEach(toast => toast.remove());

        const toast = document.createElement('div');
        toast.className = 'toast-notification';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 2rem;
            right: 2rem;
            background: var(--primary);
            color: white;
            padding: 1rem 1.5rem;
            border-radius: var(--radius);
            box-shadow: var(--shadow-lg);
            z-index: 1000;
            animation: slideIn 0.3s ease-out;
        `;

        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // Clear conversation
    clearConversation() {
        if (confirm('Clear all conversation history? This cannot be undone.')) {
            this.messages = [];
            localStorage.removeItem('eeh_coach_conversation');
            this.renderMessages();
            this.showToast('Conversation cleared');
        }
    }

    // Export chat
    exportChat() {
        const chatText = this.messages.map(msg => 
            `[${this.formatTimestamp(msg.timestamp)}] ${msg.type === 'user' ? 'You' : 'AI Coach'}: ${msg.content}`
        ).join('\n\n');
        
        const blob = new Blob([chatText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `eeh-coaching-session-${new Date().toISOString().split('T')[0]}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    }

    logout() {
        if (confirm('Are you sure you want to logout?')) {
            localStorage.removeItem('authToken');
            localStorage.removeItem('userData');
            window.location.href = 'login.html';
        }
    }
}

// Global functions for HTML onclick handlers
function sendMessage() {
    if (window.aiCoach) {
        window.aiCoach.sendMessage();
    }
}

function handleKeyPress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
}

function toggleSettings() {
    if (window.aiCoach) {
        window.aiCoach.toggleSettings();
    }
}

function clearConversation() {
    if (window.aiCoach) {
        window.aiCoach.clearConversation();
    }
}

function exportChat() {
    if (window.aiCoach) {
        window.aiCoach.exportChat();
    }
}

function quickTopic(topic) {
    if (window.aiCoach) {
        window.aiCoach.quickTopic(topic);
    }
}

function logout() {
    if (window.aiCoach) {
        window.aiCoach.logout();
    }
}

// Mood tracking
function trackMood(mood) {
    const moodPrompts = {
        great: "I'm feeling great today! I'd like to maintain this positive energy.",
        good: "I'm feeling good today. I'd like to make the most of this positive state.",
        okay: "I'm feeling okay today, but could use some guidance to feel better.",
        stressed: "I'm feeling stressed today and could use some help managing it."
    };
    
    const messageInput = document.getElementById('messageInput');
    if (messageInput && moodPrompts[mood]) {
        messageInput.value = moodPrompts[mood];
        messageInput.focus();
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.aiCoach = new AICoach();
});

// Add required CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }

    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }

    .modal {
        backdrop-filter: blur(4px);
    }

    .modal-content {
        animation: modalSlideIn 0.3s ease-out;
    }

    @keyframes modalSlideIn {
        from { opacity: 0; transform: translateY(-20px) scale(0.95); }
        to { opacity: 1; transform: translateY(0) scale(1); }
    }
`;

document.head.appendChild(style);

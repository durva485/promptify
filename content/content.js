// Track active AI platforms
const AI_PLATFORMS = {
    'chat.openai.com': {
        selector: '#prompt-textarea',
        type: 'textarea'
    },
    'bard.google.com': {
        selector: '.ql-editor',
        type: 'contenteditable'
    },
    'claude.ai': {
        selector: '.ProseMirror',
        type: 'contenteditable'
    },
    'huggingface.co': {
        selector: 'textarea',
        type: 'textarea'
    }
};

class PromptOptimizer {
    constructor() {
        this.isOptimizing = false;
        this.currentPlatform = null;
        this.init();
    }

    init() {
        this.detectPlatform();
        if (this.currentPlatform) {
            this.setupEventListeners();
        }
    }

    detectPlatform() {
        const hostname = window.location.hostname;
        for (const [platform, config] of Object.entries(AI_PLATFORMS)) {
            if (hostname.includes(platform)) {
                this.currentPlatform = { name: platform, ...config };
                break;
            }
        }
    }

    setupEventListeners() {
        // Check if auto-optimize is enabled
        chrome.storage.sync.get(['autoOptimize'], (data) => {
            if (data.autoOptimize !== false) {
                this.observeInputChanges();
            }
        });

        // Listen for messages from background script
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === 'optimizePrompt') {
                this.optimizeCurrentPrompt();
            }
        });
    }

    observeInputChanges() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList' || mutation.type === 'characterData') {
                    this.handleInputChange();
                }
            });
        });

        // Observe the entire document for changes
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true
        });
    }

    handleInputChange() {
        if (this.isOptimizing) return;

        const inputElement = document.querySelector(this.currentPlatform.selector);
        if (inputElement && this.shouldOptimize(inputElement)) {
            this.optimizePrompt(inputElement);
        }
    }

    shouldOptimize(element) {
        if (this.currentPlatform.type === 'textarea') {
            return element.value.length > 20 && element.value.length < 500;
        } else {
            return element.textContent.length > 20 && element.textContent.length < 500;
        }
    }

    async optimizePrompt(inputElement) {
        this.isOptimizing = true;

        try {
            const originalPrompt = this.currentPlatform.type === 'textarea' 
                ? inputElement.value 
                : inputElement.textContent;

            const optimizedPrompt = await this.sendForOptimization(originalPrompt);
            
            if (optimizedPrompt && optimizedPrompt !== originalPrompt) {
                this.replacePrompt(inputElement, optimizedPrompt);
                this.showOptimizationNotice(originalPrompt, optimizedPrompt);
            }
        } catch (error) {
            console.error('Prompt optimization failed:', error);
        } finally {
            this.isOptimizing = false;
        }
    }

    async sendForOptimization(prompt) {
        const response = await fetch('http://localhost:8000/optimize-prompt', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ prompt: prompt })
        });

        if (!response.ok) {
            throw new Error('Optimization service unavailable');
        }

        const data = await response.json();
        return data.optimized_prompt;
    }

    replacePrompt(inputElement, optimizedPrompt) {
        if (this.currentPlatform.type === 'textarea') {
            inputElement.value = optimizedPrompt;
            // Trigger input event for React-based applications
            inputElement.dispatchEvent(new Event('input', { bubbles: true }));
        } else {
            inputElement.textContent = optimizedPrompt;
            inputElement.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }

    showOptimizationNotice(original, optimized) {
        const notice = document.createElement('div');
        notice.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #1a73e8;
            color: white;
            padding: 10px 15px;
            border-radius: 8px;
            z-index: 10000;
            font-family: Arial, sans-serif;
            font-size: 14px;
            max-width: 300px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        
        notice.innerHTML = `
            <strong>Prompt Optimized!</strong>
            <div style="font-size: 12px; margin-top: 5px; opacity: 0.9;">
                Your prompt has been automatically improved.
            </div>
        `;

        document.body.appendChild(notice);

        setTimeout(() => {
            if (notice.parentNode) {
                notice.parentNode.removeChild(notice);
            }
        }, 3000);
    }

    optimizeCurrentPrompt() {
        const inputElement = document.querySelector(this.currentPlatform.selector);
        if (inputElement) {
            this.optimizePrompt(inputElement);
        }
    }
}

// Initialize the optimizer when the page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new PromptOptimizer());
} else {
    new PromptOptimizer();
}
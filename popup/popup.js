document.addEventListener('DOMContentLoaded', function() {
    const apiKeyInput = document.getElementById('apiKey');
    const saveKeyButton = document.getElementById('saveKey');
    const autoOptimizeCheckbox = document.getElementById('autoOptimize');
    const testPromptTextarea = document.getElementById('testPrompt');
    const testButton = document.getElementById('testButton');
    const testResultDiv = document.getElementById('testResult');
    const statusText = document.getElementById('statusText');

    // Load saved settings
    chrome.storage.sync.get(['geminiApiKey', 'autoOptimize'], function(data) {
        if (data.geminiApiKey) {
            apiKeyInput.value = data.geminiApiKey;
        }
        if (data.autoOptimize !== undefined) {
            autoOptimizeCheckbox.checked = data.autoOptimize;
        }
        updateStatus();
    });

    // Save API key
    saveKeyButton.addEventListener('click', function() {
        const apiKey = apiKeyInput.value.trim();
        if (apiKey) {
            chrome.storage.sync.set({ geminiApiKey: apiKey }, function() {
                updateStatus();
            });
        }
    });

    // Toggle auto-optimize
    autoOptimizeCheckbox.addEventListener('change', function() {
        chrome.storage.sync.set({ autoOptimize: this.checked });
    });

    // Test optimization
    testButton.addEventListener('click', async function() {
        const prompt = testPromptTextarea.value.trim();
        if (!prompt) {
            testResultDiv.textContent = 'Please enter a prompt to test';
            return;
        }

        testResultDiv.textContent = 'Optimizing...';
        
        try {
            const optimizedPrompt = await optimizePrompt(prompt);
            testResultDiv.textContent = `Optimized Prompt:\n${optimizedPrompt}`;
        } catch (error) {
            testResultDiv.textContent = `Error: ${error.message}`;
        }
    });

    async function optimizePrompt(prompt) {
        const response = await fetch('http://localhost:8000/optimize-prompt', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ prompt: prompt })
        });

        if (!response.ok) {
            throw new Error('Failed to optimize prompt');
        }

        const data = await response.json();
        return data.optimized_prompt;
    }

    function updateStatus() {
        chrome.storage.sync.get(['geminiApiKey'], function(data) {
            if (data.geminiApiKey) {
                statusText.textContent = 'API Key saved ✓';
                statusText.style.color = '#34a853';
            } else {
                statusText.textContent = 'API Key required';
                statusText.style.color = '#ea4335';
            }
        });
    }
});
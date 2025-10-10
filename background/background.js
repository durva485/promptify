// Background script for handling extension events
chrome.runtime.onInstalled.addListener(() => {
    console.log('Prompt Optimizer installed');
});

// Context menu for manual optimization
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "optimizePrompt",
        title: "Optimize this prompt",
        contexts: ["editable"]
    });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "optimizePrompt") {
        chrome.tabs.sendMessage(tab.id, { action: "optimizePrompt" });
    }
});

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "optimizePrompt") {
        // Forward to content script
        chrome.tabs.sendMessage(sender.tab.id, { action: "optimizePrompt" });
    }
});
// Listen for messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'START_CAPTURE') {
        chrome.runtime.sendMessage({
            type: 'CAPTURE_STARTED',
            success: true
        });
        return true;
    }
}); 
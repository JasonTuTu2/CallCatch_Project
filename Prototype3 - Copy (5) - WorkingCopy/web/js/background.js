// Background script for volume control
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'setVolume') {
    // Get all tabs with the specified domain
    chrome.tabs.query({url: `*://*.${message.domain}/*`}, (tabs) => {
      // For each tab, inject a content script to control volume
      tabs.forEach(tab => {
        chrome.scripting.executeScript({
          target: {tabId: tab.id},
          function: (volume) => {
            // Find all audio and video elements on the page
            const mediaElements = document.querySelectorAll('audio, video');
            mediaElements.forEach(element => {
              element.volume = volume;
            });
          },
          args: [message.volume]
        });
      });
    });
  } else if (message.action === 'enableVolume') {
    // Enable volume control for the domain
    console.log(`Volume control enabled for ${message.domain}`);
  } else if (message.action === 'disableVolume') {
    // Disable volume control for the domain
    console.log(`Volume control disabled for ${message.domain}`);
  }
  
  // Return true to indicate we'll respond asynchronously
  return true;
}); 
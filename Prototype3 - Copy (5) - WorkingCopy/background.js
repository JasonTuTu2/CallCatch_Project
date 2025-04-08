let activeStream = null;
let recognition = null;
let isListening = false;

// List of supported domains
const SUPPORTED_DOMAINS = [
    'meet.google.com',
    'teams.microsoft.com',
    'youtube.com',
    'zoom.us',
    'discord.com',
    'web.skype.com',
    'instagram.com'
];


// Initialize speech recognition
function initSpeechRecognition(userName) {
    if (!('webkitSpeechRecognition' in window)) {
        console.error('Speech Recognition not supported');
        return;
    }
    
    recognition = new webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript.toLowerCase();
            if (transcript.includes(userName.toLowerCase())) {
                chrome.storage.local.get(['settings'], (result) => {
                    const settings = result.settings || {};
                    
                    // Show notification if enabled
                    if (settings.showNotifications) {
                        // Create a unique notification ID to avoid duplicates
                        const notificationId = 'name-detected-' + Date.now();
                        
                        chrome.notifications.create(notificationId, {
                            type: 'basic',
                            iconUrl: 'icon128.png',
                            title: 'Name Detected!',
                            message: `Your name was mentioned in ${getCurrentTabTitle()}`,
                            priority: 2, // High priority
                            requireInteraction: true // Keep notification until user dismisses it
                        });
                        
                        // Also send a message to the popup if it's open
                        chrome.runtime.sendMessage({
                            type: 'NAME_DETECTED',
                            transcript: event.results[i][0].transcript
                        });
                    }

                    // Play sound if enabled
                    if (settings.playSound) {
                        const audio = new Audio(settings.selectedSound || 'sounds/chime.mp3');
                        audio.play();
                    }
                });
            }
        }
    };

    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        stopListening();
    };

    recognition.onend = () => {
        if (isListening) {
            recognition.start();
        }
    };
}

// Start capturing audio from a tab
function startTabCapture(tabId) {
    // Stop any existing capture
    stopListening();

    chrome.tabCapture.capture({
        audio: true,
        video: false,
        audioConstraints: {
            mandatory: {
                chromeMediaSource: 'tab'
            }
        }
    }, function(stream) {
        if (!stream) {
            console.error('Failed to capture tab audio');
            stopListening();
            return;
        }

        // Create AudioContext to process the stream
        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(stream);
        const streamDestination = audioContext.createMediaStreamDestination();
        source.connect(streamDestination);

        activeStream = stream;
        isListening = true;

        // Get user settings and start recognition
        chrome.storage.local.get(['userName', 'settings'], (result) => {
            if (result.userName) {
                initSpeechRecognition(result.userName);
                recognition.start();
            }
        });
    });
}

// Start capturing audio from a tab
/*async function startTabCapture(tabId) {
    try {
        // Stop any existing capture
        stopListening();

        const stream = await chrome.tabCapture.capture({
            audio: true,
            video: false
        });

        if (!stream) {
            throw new Error('Failed to capture tab audio');
        }

        // Create AudioContext to process the stream
        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(stream);
        const streamDestination = audioContext.createMediaStreamDestination();
        source.connect(streamDestination);

        activeStream = stream;
        isListening = true;

        // Get user settings and start recognition
        chrome.storage.local.get(['userName', 'settings'], (result) => {
            if (result.userName) {
                initSpeechRecognition(result.userName);
                recognition.start();
            }
        });

    } catch (error) {
        console.error('Error starting tab capture:', error);
        stopListening();
    }
}*/

// Stop listening and clean up
function stopListening() {
    if (recognition) {
        recognition.stop();
    }
    if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
        activeStream = null;
    }
    isListening = false;
}

// Check if a URL is from a supported domain
function isSupportedDomain(url) {
    return SUPPORTED_DOMAINS.some(domain => url.includes(domain));
}

// Get the current tab's title
async function getCurrentTabTitle() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    return tabs[0]?.title || 'current tab';
}

// Listen for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && isSupportedDomain(tab.url)) {
        startTabCapture(tabId);
    }
});

// Listen for tab activation
chrome.tabs.onActivated.addListener(async (activeInfo) => {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (isSupportedDomain(tab.url)) {
        startTabCapture(activeInfo.tabId);
    } else {
        stopListening();
    }
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'START_LISTENING') {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0] && isSupportedDomain(tabs[0].url)) {
                startTabCapture(tabs[0].id);
            }
        });
    } else if (request.type === 'STOP_LISTENING') {
        stopListening();
    }
    sendResponse({ success: true });
}); 
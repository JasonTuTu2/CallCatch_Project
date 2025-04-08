let activeStream = null;
let recognition = null;
let isListening = false;
let audioContext = null;
let gainNode = null;
let transcriptHistory = []; // Array to store transcript history

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

// Modify the audio playback to use the volume setting
function playAlertSound(settings) {
    if (settings.playSound) {
        const audio = new Audio(settings.selectedSound || 'sounds/chime.mp3');
        audio.volume = settings.alertVolume / 100 || 0.7; // Convert percentage to 0-1 range
        audio.play();
    }
}

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
            const fullTranscript = event.results[i][0].transcript;
            
            // Add to transcript history if it's a final result
            if (event.results[i].isFinal) {
                transcriptHistory.push(fullTranscript);
                // Keep only the last 2 transcripts
                if (transcriptHistory.length > 2) {
                    transcriptHistory.shift();
                }
            }
            
            // Update caption text with current transcript
            const captionText = document.getElementById('captionText');
            const historyContainer = document.getElementById('transcriptHistory');
            
            if (captionText) {
                // Always show current transcript
                captionText.textContent = fullTranscript;
                
                // Show last 2 lines for 5 seconds if name is detected
                if (transcript.includes(userName.toLowerCase())) {
                    if (historyContainer) {
                        historyContainer.innerHTML = transcriptHistory
                            .map(t => `<div class="history-item">${t}</div>`)
                            .join('');
                        historyContainer.classList.add('visible');
                        
                        // Hide after 5 seconds
                        setTimeout(() => {
                            historyContainer.classList.remove('visible');
                            historyContainer.innerHTML = ''; // Clear the content
                        }, 5000);
                    }
                }
            }

            if (transcript.includes(userName.toLowerCase())) {
                // Show visual alert in popup
                const alertDiv = document.getElementById('nameAlert');
                if (alertDiv) {
                    alertDiv.style.display = 'flex';
                    alertDiv.className = 'name-alert-active';
                    // Auto-hide after 5 seconds
                    setTimeout(() => {
                        alertDiv.style.display = 'none';
                        alertDiv.className = '';
                    }, 5000);
                }

                chrome.storage.local.get(['settings'], (result) => {
                    const settings = result.settings || {};
                    
                    // Show notification if enabled
                    if (settings.showNotifications) {
                        chrome.notifications.create({
                            type: 'basic',
                            iconUrl: 'icon128.png',
                            title: 'Name Detected!',
                            message: `Your name was mentioned`
                        });
                    }

                    // Play sound if enabled
                    playAlertSound(settings);

                    // Increase website volume when name is detected
                    if (gainNode) {
                        const targetVolume = (settings.alertVolume || 70) / 100;
                        gainNode.gain.setValueAtTime(targetVolume, audioContext.currentTime);
                        // Reset volume after 5 seconds
                        setTimeout(() => {
                            gainNode.gain.setValueAtTime(0.5, audioContext.currentTime); // Reset to normal volume
                        }, 5000);
                    }
                });
            }
        }
    };

    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        stopListening();
        updateUI();
    };

    recognition.onend = () => {
        if (isListening) {
            try {
                recognition.start();
            } catch (error) {
                console.error('Failed to restart recognition:', error);
                stopListening();
                updateUI();
            }
        }
    };

    try {
        recognition.start();
    } catch (error) {
        console.error('Failed to start recognition:', error);
        stopListening();
        updateUI();
    }
}

// Start capturing audio from current tab
function startListening() {
    chrome.tabCapture.capture({
        audio: true,
        video: false
    }, function(stream) {
        if (!stream) {
            console.error('Failed to capture tab audio');
            stopListening();
            return;
        }

        // Create AudioContext to process the stream
        audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(stream);
        gainNode = audioContext.createGain();
        const streamDestination = audioContext.createMediaStreamDestination();

        // Connect the audio nodes
        source.connect(gainNode);
        gainNode.connect(streamDestination);
        gainNode.gain.setValueAtTime(0.5, audioContext.currentTime); // Set initial volume to 50%

        activeStream = stream;
        isListening = true;

        // Get user settings and start recognition with the tab audio stream
        chrome.storage.local.get(['userName'], (result) => {
            if (result.userName) {
                initSpeechRecognition(result.userName);
            }
        });

        // Update UI after successful capture
        updateUI();
    });
}

// Stop listening and clean up
function stopListening() {
    if (recognition) {
        recognition.stop();
    }
    if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
        activeStream = null;
    }
    if (audioContext) {
        audioContext.close();
        audioContext = null;
        gainNode = null;
    }
    isListening = false;
}

// Update UI elements
function updateUI() {
    const toggleButton = document.getElementById('toggleListening');
    const statusIndicator = document.getElementById('status-indicator');
    
    if (toggleButton) {
        toggleButton.textContent = isListening ? 'Stop Listening' : 'Start Listening';
        toggleButton.className = 'btn-primary ' + (isListening ? 'active' : '');
    }
    
    if (statusIndicator) {
        statusIndicator.textContent = isListening ? 'Listening' : 'Not listening';
        statusIndicator.className = 'status-indicator ' + (isListening ? 'active' : '');
    }
}

// Initialize popup
document.addEventListener('DOMContentLoaded', () => {
    const nameInput = document.querySelector('.name-input');
    const saveButton = nameInput?.nextElementSibling;
    const notificationToggle = document.getElementById('notificationToggle');
    const soundToggle = document.getElementById('soundToggle');
    const soundSelect = document.getElementById('soundSelect');
    const alertVolume = document.getElementById('alertVolume');
    const toggleListeningButton = document.getElementById('toggleListening');
    const statusIndicator = document.getElementById('status-indicator');
    const currentTabSpan = document.getElementById('currentTab');

    // Load saved settings
    chrome.storage.local.get(['userName', 'settings'], (result) => {
        if (result.userName && nameInput) {
            nameInput.value = result.userName;
        }

        const settings = result.settings || {};
        if (notificationToggle) {
            notificationToggle.checked = settings.showNotifications !== false;
        }
        if (soundToggle) {
            soundToggle.checked = settings.playSound !== false;
        }
        if (soundSelect && settings.selectedSound) {
            soundSelect.value = settings.selectedSound;
        }
        if (alertVolume && settings.alertVolume !== undefined) {
            alertVolume.value = settings.alertVolume;
        }
    });

    // Listen for messages from the background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'NAME_DETECTED') {
            // Show visual alert in popup
            const alertDiv = document.getElementById('nameAlert');
            if (alertDiv) {
                alertDiv.style.display = 'flex';
                alertDiv.className = 'name-alert-active';
                // Auto-hide after 5 seconds
                setTimeout(() => {
                    alertDiv.style.display = 'none';
                    alertDiv.className = '';
                }, 5000);
            }
            
            // Update caption text with the transcript
            const captionText = document.getElementById('captionText');
            if (captionText) {
                captionText.textContent = message.transcript;
            }
            
            // Show transcript history
            const historyContainer = document.getElementById('transcriptHistory');
            if (historyContainer) {
                historyContainer.innerHTML = transcriptHistory
                    .map(t => `<div class="history-item">${t}</div>`)
                    .join('');
                historyContainer.classList.add('visible');
                
                // Hide after 5 seconds
                setTimeout(() => {
                    historyContainer.classList.remove('visible');
                    historyContainer.innerHTML = ''; // Clear the content
                }, 5000);
            }
        }
    });

    // Update current tab info
    async function updateCurrentTab() {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const currentTab = tabs[0];
        
        if (currentTab && currentTabSpan) {
            const url = new URL(currentTab.url);
            const isSupported = SUPPORTED_DOMAINS.some(domain => url.hostname.includes(domain));

            if (isSupported) {
                currentTabSpan.textContent = currentTab.title;
                toggleListeningButton.disabled = false;
            } else {
                currentTabSpan.textContent = 'No supported site active';
                toggleListeningButton.disabled = true;
                isListening = false;
                updateListeningStatus();
            }
        }
    }

    // Update the listening status display
    function updateListeningStatus() {
        if (statusIndicator) {
            statusIndicator.textContent = isListening ? 'Listening' : 'Not listening';
            statusIndicator.className = 'status-indicator ' + (isListening ? 'active' : '');
        }
        if (toggleListeningButton) {
            toggleListeningButton.textContent = isListening ? 'Stop Listening' : 'Start Listening';
            toggleListeningButton.className = 'btn-primary ' + (isListening ? 'active' : '');
        }
    }

    // Save name
    if (saveButton) {
        saveButton.addEventListener('click', () => {
            const name = nameInput.value.trim();
            if (name) {
                chrome.storage.local.set({ userName: name }, () => {
                    alert('Name saved successfully!');
                });
            } else {
                alert('Please enter a name');
            }
        });
    }

    // Save settings when changed
    function saveSettings() {
        const settings = {
            showNotifications: notificationToggle.checked,
            playSound: soundToggle.checked,
            selectedSound: soundSelect.value,
            alertVolume: alertVolume.value
        };
        chrome.storage.local.set({ settings });
    }

    // Add event listeners for settings changes
    if (notificationToggle) {
        notificationToggle.addEventListener('change', saveSettings);
    }
    if (soundToggle) {
        soundToggle.addEventListener('change', saveSettings);
    }
    if (soundSelect) {
        soundSelect.addEventListener('change', saveSettings);
    }
    if (alertVolume) {
        alertVolume.addEventListener('input', saveSettings);
    }

    // Toggle listening
    if (toggleListeningButton) {
        toggleListeningButton.addEventListener('click', () => {
            if (isListening) {
                stopListening();
            } else {
                startListening();
            }
            updateUI();
        });
    }

    // Update current tab information when popup opens
    updateCurrentTab();

    // Initial UI update
    updateUI();

    // Create and add the alert div if it doesn't exist
    if (!document.getElementById('nameAlert')) {
        const alertDiv = document.createElement('div');
        alertDiv.id = 'nameAlert';
        alertDiv.className = 'name-alert';
        alertDiv.style.display = 'none';
        alertDiv.innerHTML = `
            <div class="alert-content">
                <span class="alert-icon">⚠️</span>
                <span class="alert-text">NAME CALLED!</span>
            </div>
        `;
        document.body.insertBefore(alertDiv, document.body.firstChild);
    }

    // Modify the audio playback to use the volume setting
    function playAlertSound(settings) {
        if (settings.playSound) {
            const audio = new Audio(settings.selectedSound || 'sounds/chime.mp3');
            audio.volume = settings.alertVolume / 100 || 0.7; // Convert percentage to 0-1 range
            audio.play();
        }
    }

    // Open Web Interface button handler
    const openWebInterfaceBtn = document.getElementById('openWebInterface');
    if (openWebInterfaceBtn) {
        openWebInterfaceBtn.addEventListener('click', () => {
            const url = chrome.runtime.getURL('web/index.html');
            chrome.tabs.create({ url });
        });
    }
}); 
document.addEventListener('DOMContentLoaded', () => {
    // Volume slider functionality
    const volumeSlider = document.querySelector('.volume-slider');
    const volumeValue = document.querySelector('.volume-value');
    
    if (volumeSlider && volumeValue) {
        volumeSlider.addEventListener('input', (e) => {
            const value = e.target.value;
            volumeValue.textContent = `${value}%`;
        });
    }

    // Name detection and speech recognition setup
    const nameInput = document.querySelector('.name-input');
    const saveButton = nameInput?.nextElementSibling;
    let userName = localStorage.getItem('username') || '';
    let recognition = null;
    
    if (nameInput) {
        nameInput.value = userName;
    }

    // Sound alert setup
    const soundSelect = document.querySelector('.sound-select');
    const sounds = {
        chime: new Audio('https://assets.mixkit.co/sfx/preview/mixkit-software-interface-start-2574.mp3'),
        bell: new Audio('https://assets.mixkit.co/sfx/preview/mixkit-classic-short-alarm-993.mp3'),
        notification: new Audio('https://assets.mixkit.co/sfx/preview/mixkit-software-interface-remove-2576.mp3')
    };
    let selectedSound = 'chime';

    if (soundSelect) {
        soundSelect.addEventListener('change', (e) => {
            selectedSound = e.target.value;
            if (sounds[selectedSound]) {
                sounds[selectedSound].play();
            }
        });
    }

    async function requestMicrophonePermission() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            // Stop the stream immediately as we don't need it, we just wanted the permission
            stream.getTracks().forEach(track => track.stop());
            return true;
        } catch (err) {
            console.error('Microphone permission denied:', err);
            alert('Microphone access is required for name detection to work. Please allow microphone access and try again.');
            return false;
        }
    }

    // Speech Recognition Setup
    async function startSpeechRecognition() {
        if (!userName) return;

        if (!('webkitSpeechRecognition' in window)) {
            alert('Speech Recognition is not supported in your browser. Please use Chrome.');
            return;
        }

        // Request microphone permission first
        const hasPermission = await requestMicrophonePermission();
        if (!hasPermission) return;

        // If there's an existing recognition instance, stop it
        if (recognition) {
            recognition.stop();
        }

        recognition = new webkitSpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onstart = () => {
            console.log('Speech recognition started');
            // Visual feedback that the system is listening
            if (saveButton) {
                saveButton.textContent = 'Listening...';
                saveButton.style.backgroundColor = '#22c55e'; // Green color to indicate active
            }
        };

        recognition.onresult = (event) => {
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript.toLowerCase();
                const userNameLower = userName.toLowerCase();

                if (transcript.includes(userNameLower)) {
                    // Play selected sound
                    const soundEnabled = document.querySelector('.alert-options input[type="checkbox"]:last-child').checked;
                    if (soundEnabled && sounds[selectedSound]) {
                        sounds[selectedSound].play();
                    }

                    // Show notification
                    const popupEnabled = document.querySelector('.alert-options input[type="checkbox"]:first-child').checked;
                    if (popupEnabled) {
                        showNotification();
                    }

                    // Adjust volume if needed
                    const volumeLevel = volumeSlider?.value || 75;
                    console.log(`Adjusting volume to ${volumeLevel}%`);
                }
            }
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            if (saveButton) {
                saveButton.textContent = 'Save';
                saveButton.style.backgroundColor = ''; // Reset color
            }
            // Restart recognition if it errors out, but after a delay
            setTimeout(() => startSpeechRecognition(), 1000);
        };

        recognition.onend = () => {
            console.log('Speech recognition ended');
            if (saveButton) {
                saveButton.textContent = 'Save';
                saveButton.style.backgroundColor = ''; // Reset color
            }
            // Restart recognition when it ends
            recognition.start();
        };

        try {
            recognition.start();
        } catch (e) {
            console.error('Speech recognition error:', e);
            if (saveButton) {
                saveButton.textContent = 'Save';
                saveButton.style.backgroundColor = ''; // Reset color
            }
        }
    }

    if (saveButton) {
        saveButton.addEventListener('click', async () => {
            userName = nameInput.value.trim();
            if (userName) {
                localStorage.setItem('username', userName);
                alert('Name saved successfully! Starting name detection...');
                await startSpeechRecognition();
            } else {
                alert('Please enter a name');
            }
        });
    }

    // Notification function
    function showNotification() {
        if (!("Notification" in window)) {
            alert("This browser does not support desktop notifications");
            return;
        }

        if (Notification.permission !== "granted") {
            Notification.requestPermission().then(permission => {
                if (permission === "granted") {
                    createNotification();
                }
            });
        } else {
            createNotification();
        }
    }

    function createNotification() {
        const notification = new Notification("Name Detected!", {
            body: `Your name (${userName}) was mentioned`,
            icon: "/favicon.ico",
            silent: true
        });

        setTimeout(() => notification.close(), 5000);
    }

    // Start speech recognition if name exists
    if (userName) {
        startSpeechRecognition();
    }

    // Request notification permission on page load
    if ("Notification" in window) {
        Notification.requestPermission();
    }
}); 
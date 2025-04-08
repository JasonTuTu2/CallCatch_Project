document.addEventListener('DOMContentLoaded', () => {
    // Get settings from extension storage
    chrome.storage.local.get(['name', 'soundEnabled', 'selectedSound', 'alertVolume'], (settings) => {
        const nameInput = document.querySelector('.name-input');
        const volumeSlider = document.querySelector('.volume-slider');
        
        if (settings.name) {
            nameInput.value = settings.name;
        }
        
        if (settings.alertVolume) {
            volumeSlider.value = settings.alertVolume;
        }
    });

    // Save button click handler
    const saveButton = document.querySelector('.name-input-container .btn-primary');
    saveButton.addEventListener('click', () => {
        const name = document.querySelector('.name-input').value;
        chrome.storage.local.set({ name }, () => {
            // Show success message
            alert('Name saved successfully!');
        });
    });

    // Volume slider change handler
    const volumeSlider = document.querySelector('.volume-slider');
    volumeSlider.addEventListener('change', () => {
        const alertVolume = volumeSlider.value;
        chrome.storage.local.set({ alertVolume });
    });

    // Get Started button handler
    const getStartedBtn = document.querySelector('.hero .btn-primary');
    getStartedBtn.addEventListener('click', () => {
        document.querySelector('.name-input').focus();
    });
}); 
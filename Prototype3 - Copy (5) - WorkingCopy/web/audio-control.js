document.addEventListener('DOMContentLoaded', () => {
    // Update volume value display when slider changes
    const volumeSliders = document.querySelectorAll('.volume-slider');
    volumeSliders.forEach(slider => {
        const valueDisplay = slider.parentElement.querySelector('.volume-value');
        slider.addEventListener('input', () => {
            valueDisplay.textContent = `${slider.value}%`;
        });
    });

    // Toggle switches state management
    const toggles = document.querySelectorAll('.toggle input');
    toggles.forEach(toggle => {
        toggle.addEventListener('change', () => {
            const siteCard = toggle.closest('.site-card');
            const siteName = siteCard.querySelector('.site-name').textContent;
            const isEnabled = toggle.checked;
            
            // Save state to extension storage
            chrome.storage.local.set({
                [`${siteName.toLowerCase()}_enabled`]: isEnabled
            });
        });
    });

    // Load saved states from extension storage
    chrome.storage.local.get(null, (data) => {
        toggles.forEach(toggle => {
            const siteCard = toggle.closest('.site-card');
            const siteName = siteCard.querySelector('.site-name').textContent;
            const storageKey = `${siteName.toLowerCase()}_enabled`;
            
            if (data[storageKey] !== undefined) {
                toggle.checked = data[storageKey];
            }
        });
    });
}); 
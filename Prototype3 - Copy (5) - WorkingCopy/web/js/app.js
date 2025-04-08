// Initialize Volume Master for each site
document.addEventListener('DOMContentLoaded', async () => {
    // Create volume controllers for each site
    const sites = [
        { id: 'google-meet', domain: 'meet.google.com' },
        { id: 'youtube', domain: 'youtube.com' },
        { id: 'zoom', domain: 'zoom.us' },
        { id: 'teams', domain: 'teams.microsoft.com' },
        { id: 'instagram', domain: 'instagram.com' }
    ];

    // Initialize volume controllers
    const volumeControllers = {};
    
    for (const site of sites) {
        try {
            volumeControllers[site.id] = await VolumeMaster.createController({
                domain: site.domain,
                defaultVolume: 1.0
            });

            // Add event listeners to volume sliders
            const slider = document.querySelector(`#${site.id}-volume`);
            if (slider) {
                slider.addEventListener('input', (e) => {
                    const volume = parseFloat(e.target.value) / 100;
                    volumeControllers[site.id].setVolume(volume);
                    
                    // Update volume display
                    const display = document.querySelector(`#${site.id}-volume-value`);
                    if (display) {
                        display.textContent = `${e.target.value}%`;
                    }
                });

                // Set initial volume from storage
                chrome.storage.local.get(`${site.id}_volume`, (data) => {
                    const savedVolume = data[`${site.id}_volume`] || 70;
                    slider.value = savedVolume;
                    volumeControllers[site.id].setVolume(savedVolume / 100);
                });
            }
        } catch (error) {
            console.error(`Failed to initialize volume control for ${site.domain}:`, error);
        }
    }

    // Handle site toggles
    document.querySelectorAll('.site-toggle').forEach(toggle => {
        toggle.addEventListener('change', (e) => {
            const siteId = e.target.dataset.site;
            const isEnabled = e.target.checked;
            
            if (volumeControllers[siteId]) {
                if (isEnabled) {
                    volumeControllers[siteId].enable();
                } else {
                    volumeControllers[siteId].disable();
                }
                
                // Save state
                chrome.storage.local.set({
                    [`${siteId}_enabled`]: isEnabled
                });
            }
        });
    });

    // Handle name detection toggles
    document.querySelectorAll('.name-detection-toggle').forEach(toggle => {
        toggle.addEventListener('change', (e) => {
            const siteId = e.target.dataset.site;
            const isEnabled = e.target.checked;
            
            // Save name detection state
            chrome.storage.local.set({
                [`${siteId}_name_detection`]: isEnabled
            });
        });
    });
}); 
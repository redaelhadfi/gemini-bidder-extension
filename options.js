/**
 * options.js: Handles the logic for the extension's options page.
 * - Loads the saved API key when the page opens.
 * - Saves the entered API key to Chrome storage when the user clicks "Save".
 * - Provides user feedback (success/error messages).
 */

document.addEventListener('DOMContentLoaded', () => {
    // Get references to the relevant HTML elements
    const apiKeyInput = document.getElementById('apiKey'); // The input field for the API key
    const saveBtn = document.getElementById('saveBtn');   // The save button
    const statusDiv = document.getElementById('status');   // The div to display status messages

    /**
     * Displays a status message to the user.
     * @param {string} message - The message text.
     * @param {'success' | 'error' | 'info'} type - The type of message for styling.
     */
    function showStatus(message, type) {
        statusDiv.textContent = message;
        // Remove existing type classes
        statusDiv.classList.remove('success', 'error', 'info');
        // Add the new type class (which also makes it visible via CSS)
        if (type) {
            statusDiv.classList.add(type);
        }
        // Optional: Auto-hide the message after a few seconds
        // setTimeout(() => {
        //     statusDiv.textContent = '';
        //     statusDiv.classList.remove('success', 'error', 'info');
        // }, 5000); // Hide after 5 seconds
    }

    /**
     * Loads the currently saved API key (if any) from Chrome storage
     * and populates the input field when the options page opens.
     */
    function loadApiKey() {
        // Use chrome.storage.sync to retrieve the key
        chrome.storage.sync.get('geminiApiKey', (result) => {
            if (chrome.runtime.lastError) {
                // Handle errors during storage access
                console.error("Options: Error loading API key:", chrome.runtime.lastError.message);
                showStatus(`Error loading saved key: ${chrome.runtime.lastError.message}`, 'error');
            } else if (result.geminiApiKey) {
                // If a key is found, put it in the input field
                apiKeyInput.value = result.geminiApiKey;
                console.log("Options: Loaded existing API key.");
                showStatus('Current API Key loaded.', 'info'); // Inform user key is loaded
                 // Clear status after a short delay
                setTimeout(() => { if (statusDiv.classList.contains('info')) showStatus('', null); }, 2000);
            } else {
                // If no key is found in storage
                console.log("Options: No API key found in storage.");
                // Optionally show a message indicating no key is set
                 showStatus('No API Key currently saved. Please enter one.', 'info');
                 setTimeout(() => { if (statusDiv.classList.contains('info')) showStatus('', null); }, 3000);
            }
        });
    }

    /**
     * Saves the API key entered in the input field to Chrome storage.
     */
    function saveApiKey() {
        // Get the value from the input field and remove leading/trailing whitespace
        const apiKey = apiKeyInput.value.trim();

        if (apiKey) {
            // If the input field is not empty, save the key
            chrome.storage.sync.set({ 'geminiApiKey': apiKey }, () => {
                if (chrome.runtime.lastError) {
                    // Handle errors during saving
                    console.error("Options: Error saving API key:", chrome.runtime.lastError.message);
                    showStatus(`Error saving key: ${chrome.runtime.lastError.message}`, 'error');
                } else {
                    // Provide success feedback
                    console.log("Options: API Key saved successfully.");
                    showStatus('API Key saved successfully!', 'success');
                }
            });
        } else {
            // If the input field is empty, remove the key from storage
            chrome.storage.sync.remove('geminiApiKey', () => {
                 if (chrome.runtime.lastError) {
                    console.error("Options: Error removing API key:", chrome.runtime.lastError.message);
                    showStatus(`Error removing key: ${chrome.runtime.lastError.message}`, 'error');
                 } else {
                    console.log("Options: API Key removed from storage.");
                    showStatus('API Key field cleared and removed from storage.', 'info');
                 }
            });
        }
    }

    // --- Event Listeners ---

    // Add a click event listener to the save button
    saveBtn.addEventListener('click', saveApiKey);

    // Add listener to save on pressing Enter in the input field
    apiKeyInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            saveApiKey();
        }
    });


    // --- Initialization ---

    // Load the saved API key when the options page is opened
    loadApiKey();

    console.log("Options script initialized.");
});

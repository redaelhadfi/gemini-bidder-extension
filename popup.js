/**
 * popup.js: Handles the logic for the extension's popup window (action popup).
 * - Step 1: Generate button fetches bid from background via content script.
 * - Displays generated bid in a textarea.
 * - Step 2: Insert button sends the previewed bid to content script for insertion.
 */

document.addEventListener('DOMContentLoaded', () => {
    // Get references to the HTML elements
    const generateBtn = document.getElementById('generateBtn');
    const insertBtn = document.getElementById('insertBtn');
    const statusP = document.getElementById('status');
    const optionsLink = document.getElementById('optionsLink');
    const bidPreviewTextArea = document.getElementById('bidPreview');

    let generatedBidText = ''; // Variable to store the generated bid

    /**
     * Updates the status message display in the popup.
     * @param {string} message - The text message to display.
     * @param {'info' | 'success' | 'error' | 'warning'} type - The type of message (controls styling).
     */
    function updateStatus(message, type = 'info') {
        statusP.textContent = message;
        statusP.style.fontWeight = '500';
        // Reset background/color before setting new ones
        statusP.style.backgroundColor = '';
        statusP.style.color = '';

        switch (type) {
            case 'success':
                statusP.style.color = '#16a34a'; // Green text
                statusP.style.backgroundColor = '#dcfce7'; // Light green background
                break;
            case 'error':
                statusP.style.color = '#dc2626'; // Red text
                statusP.style.backgroundColor = '#fee2e2'; // Light red background
                break;
            case 'warning':
                statusP.style.color = '#d97706'; // Amber/Orange text
                statusP.style.backgroundColor = '#fef3c7'; // Light yellow background
                break;
            case 'info':
            default:
                statusP.style.color = '#374151'; // Dark Gray text
                statusP.style.backgroundColor = '#e5e7eb'; // Light Gray background
                break;
        }
    }

    /**
     * Handles the click event for the "Generate Bid Preview" button.
     */
    generateBtn.addEventListener('click', async () => {
        updateStatus('Requesting job description...', 'info');
        generateBtn.disabled = true;
        insertBtn.style.display = 'none'; // Hide insert button
        bidPreviewTextArea.style.display = 'none'; // Hide preview area
        bidPreviewTextArea.value = ''; // Clear previous preview
        generatedBidText = ''; // Clear stored bid

        let tab;

        try {
            [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab || !tab.id) {
                throw new Error("Could not find active tab.");
            }

            // Send message to content script to START the process
            // *** IT MUST SEND 'getJobDescription' ***
            console.log(`Popup: Sending 'getJobDescription' action to tab ${tab.id}`);
            const response = await chrome.tabs.sendMessage(tab.id, { action: "getJobDescription" }); // <-- CORRECT ACTION

            if (chrome.runtime.lastError) {
                console.error("Popup -> Content Script connection Error:", chrome.runtime.lastError.message);
                 // Check if the error message indicates the receiving end doesn't exist
                 if (chrome.runtime.lastError.message?.includes("Receiving end does not exist")) {
                    throw new Error(`Could not connect to the page content. Ensure you are on the correct job page (matching manifest patterns: *://*.freelancer.com/projects/*/*) and REFRESH the page.`);
                 } else {
                    throw new Error(`Connection error: ${chrome.runtime.lastError.message}`);
                 }
            }

            // Process the response FROM THE BACKGROUND SCRIPT (relayed by content script)
            console.log("Popup: Received response (should be bid or error):", response);
            if (response) {
                if (response.status === 'success' && response.bid) {
                    updateStatus('Bid generated successfully. Preview below.', 'success');
                    generatedBidText = response.bid; // Store the bid
                    bidPreviewTextArea.value = generatedBidText; // Display in textarea
                    bidPreviewTextArea.style.display = 'block'; // Show textarea
                    bidPreviewTextArea.readOnly = false; // Allow editing if desired
                    insertBtn.style.display = 'block'; // Show insert button
                    insertBtn.disabled = false; // Enable insert button
                } else if (response.status === 'error') {
                    updateStatus(`Error generating bid: ${response.message}`, 'error');
                } else {
                    updateStatus('Received an unknown response after generation request.', 'warning');
                }
            } else {
                 updateStatus('No response received after generation request.', 'warning');
            }

        } catch (error) {
            console.error("Error during bid generation request:", error);
            // Display the specific error message caught
            updateStatus(`${error.message}`, 'error');
        } finally {
            generateBtn.disabled = false; // Re-enable generate button
        }
    });

    /**
     * Handles the click event for the "Insert Bid into Page" button.
     */
    insertBtn.addEventListener('click', async () => {
        // Update generatedBidText from textarea in case user edited it
        generatedBidText = bidPreviewTextArea.value;

        if (!generatedBidText) {
            updateStatus('No bid text available to insert.', 'warning');
            return;
        }

        updateStatus('Inserting bid into page...', 'info');
        insertBtn.disabled = true; // Disable while inserting

        let tab;
        try {
            [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab || !tab.id) {
                throw new Error("Could not find active tab to insert bid.");
            }

            // Send message to content script to perform the insertion
            console.log(`Popup: Sending 'insertGeneratedBid' action to tab ${tab.id}`);
            const response = await chrome.tabs.sendMessage(tab.id, {
                action: "insertGeneratedBid",
                bidText: generatedBidText // Send the (potentially edited) bid text
            });

            if (chrome.runtime.lastError) {
                console.error("Popup -> Content Script connection Error (Insert):", chrome.runtime.lastError.message);
                 if (chrome.runtime.lastError.message?.includes("Receiving end does not exist")) {
                    throw new Error(`Could not connect to the page content to insert bid. Please REFRESH the page.`);
                 } else {
                    throw new Error(`Connection error during insert: ${chrome.runtime.lastError.message}`);
                 }
            }

            // Process response from content script about insertion status
            console.log("Popup: Received response from content script after insertion:", response);
             if (response && response.status === 'success') {
                updateStatus('Bid inserted successfully!', 'success');
                // Optionally hide buttons/preview after success
                // insertBtn.style.display = 'none';
                // bidPreviewTextArea.style.display = 'none';
            } else if (response && response.status === 'error') {
                updateStatus(`Error inserting bid: ${response.message}`, 'error');
            } else {
                updateStatus('Received an unknown response after insertion request.', 'warning');
            }

        } catch (error) {
            console.error("Error during bid insertion:", error);
            updateStatus(`${error.message}`, 'error');
            // insertBtn.disabled = false; // Re-enable insert button on error? Or keep disabled?
        } finally {
             // Decide whether to re-enable the insert button or not
             // insertBtn.disabled = false;
        }
    });


    /**
     * Handles the click event for the "Configure API Key" link.
     */
    optionsLink.addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
    });

    /**
     * Check for the Gemini API key when the popup opens.
     */
    chrome.storage.sync.get('geminiApiKey', (result) => {
        if (chrome.runtime.lastError) {
             console.warn("Error checking API key status:", chrome.runtime.lastError);
             updateStatus('Could not check API key status.', 'warning');
             generateBtn.disabled = true;
        } else if (!result.geminiApiKey) {
            updateStatus('API Key needed. Click "Configure API Key" below.', 'warning');
            generateBtn.disabled = true;
        } else {
            updateStatus('Ready to generate bid preview.', 'info');
            generateBtn.disabled = false;
        }
        // Ensure insert button and preview are hidden on initial load
        insertBtn.style.display = 'none';
        bidPreviewTextArea.style.display = 'none';
        bidPreviewTextArea.readOnly = true; // Start as readonly
    });

    console.log("Popup script initialized (Preview Version).");
});

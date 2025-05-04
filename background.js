/**
 * background.js: Service worker for the Chrome Extension.
 * - Runs in the background, independent of any specific web page.
 * - Listens for messages from content scripts.
 * - Handles communication with the external Gemini API.
 * - Manages API key retrieval from chrome.storage.
 * - Sends results or errors back to the content script.
 * - Handles extension installation/update events (e.g., opening options page).
 */

console.log("Background service worker started.");

// --- API Key Management ---

/**
 * Asynchronously retrieves the Gemini API key from synchronized Chrome storage.
 * @returns {Promise<string|undefined>} A promise that resolves with the API key string, or undefined if not found or an error occurs.
 */
async function getApiKey() {
    try {
        // Use chrome.storage.sync to get the key (syncs across user's devices if signed in)
        // Use chrome.storage.local for local-only storage.
        const result = await chrome.storage.sync.get('geminiApiKey');
        if (chrome.runtime.lastError) {
            // Check for errors during storage access
            console.error("Error retrieving API key from storage:", chrome.runtime.lastError.message);
            return undefined;
        }
        console.log("Background: API Key retrieved from storage.");
        return result.geminiApiKey; // Access the key using the key name used during saving
    } catch (error) {
        console.error("Background: Exception while retrieving API key:", error);
        return undefined;
    }
}

// --- Gemini API Call ---

/**
 * Calls the Google Generative Language API (Gemini) to generate a bid.
 * @param {string} description - The job description text extracted by the content script.
 * @returns {Promise<string>} A promise that resolves with the generated bid text.
 * @throws {Error} Throws an error if the API key is missing, the API call fails, or the response is invalid/blocked.
 */
async function generateBidWithGemini(description) {
    const apiKey = await getApiKey();
    if (!apiKey) {
        console.error("Background: Gemini API Key not found in storage.");
        // Throw an error that will be caught and sent back to the content script/popup
        throw new Error("API Key not set. Please configure it via the extension options (right-click extension icon -> Options).");
    }

    // --- API Endpoint and Model Selection ---
    // Consider using 'gemini-1.5-flash-latest' for speed/cost efficiency if sufficient.
    // 'gemini-pro' is another common choice. Check Google AI documentation for current models.
    const API_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent";
    // const API_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent";

    // --- Prompt Engineering ---
    // This prompt guides the AI to generate the bid in the desired structure.
    // It's crucial to be clear and specific.
    const prompt = `
Analyze the following freelance job description and generate a concise (approximately 2-5 lines total) and professional bid proposal adhering STRICTLY to the structure below.

**Job Description:**
---
${description}
---

**Required Bid Structure:**

1.  **Personalized Introduction:** Start *exactly* with: "Hey there, I am a [Project Type] engineer with over 5 years of experience."
    * You MUST identify the specific [Project Type] from the job description (e.g., Flutter Development, SVG Editing, Software Development, Network Engineering, AI Development, Web Development etc.) and insert it into the sentence. Use the most specific and relevant type possible based ONLY on the provided description.

2.  **How You Will Help:** Write a *very brief* (1 sentence maximum) summary focusing on how the bidder's skills directly address the client's main requirement or goal mentioned in the job description.

3.  **Technical Expertise Statement:** Use the *exact* format: "My expertise includes [Skill 1], [Skill 2], and [Skill 3]."
    * You MUST identify the 2 or 3 most relevant technical skills directly mentioned or strongly implied in the job description and list them. Do not invent skills not present in the description.

4.  **Closing Statement:** End *exactly* with: "With my experience, I’m sure I can finish this task in a very short time, assuring the expected results. Feel free to check my profile and contact me for more details. Regards,"
    * Do NOT add a name, placeholder like "[Your Name]", or any other text after "Regards,".

**Instructions for Generation:**
* Combine these four parts into a single block of text, following the order precisely.
* The entire response should be concise, professional, and ready to be submitted as a bid.
* Do NOT include the section titles ("Personalized Introduction:", "How You Will Help:", etc.) in the final output.
* Do NOT include any placeholders like "[Your Name]". The bid must end exactly after "Regards,".

**Generated Bid Proposal:**
`; // End of prompt template literal

    console.log("Background: Sending request to Gemini API...");

    try {
        // Make the API call using the fetch API
        const response = await fetch(`${API_ENDPOINT}?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                // Structure the request body according to the Gemini API documentation
                contents: [{
                    parts: [{ text: prompt }]
                }],
                // Optional: Configure generation parameters (temperature, safety, etc.)
                generationConfig: {
                    temperature: 0.6, // Controls randomness (lower means more focused)
                    // maxOutputTokens: 200, // Limit response length if needed
                    // topP: 0.9, // Nucleus sampling parameter
                    // topK: 40   // Top-k sampling parameter
                },
                // Optional: Configure safety settings to block harmful content
                safetySettings: [
                    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                ]
            }),
        });

        // Attempt to parse the response body as JSON, regardless of status code
        const responseBody = await response.json();

        // Check if the API request was successful (HTTP status 2xx)
        if (!response.ok) {
            console.error("Background: Gemini API Error Response:", response.status, responseBody);
            // Extract a meaningful error message from the response body if possible
            const errorDetails = responseBody?.error?.message || `API request failed with status ${response.status}. Check API key and endpoint.`;
            throw new Error(errorDetails);
        }

        // --- Process the successful response ---

        // Check for content blocking due to safety filters or other reasons
        if (responseBody.promptFeedback && responseBody.promptFeedback.blockReason) {
            const blockReason = responseBody.promptFeedback.blockReason;
            const safetyRatings = responseBody.promptFeedback.safetyRatings;
            console.error(`Background: Gemini API blocked the prompt: ${blockReason}`, safetyRatings);
            throw new Error(`Content blocked by API safety filters: ${blockReason}. Adjust prompt or content if possible.`);
        }

        // Extract the generated text from the expected location in the response
        // The exact path might vary slightly depending on the model and API version
        if (responseBody.candidates && responseBody.candidates.length > 0 &&
            responseBody.candidates[0].content && responseBody.candidates[0].content.parts &&
            responseBody.candidates[0].content.parts.length > 0 &&
            responseBody.candidates[0].content.parts[0].text)
        {
            const generatedText = responseBody.candidates[0].content.parts[0].text;
            console.log("Background: Received successful response from Gemini.");
            return generatedText.trim(); // Return the cleaned-up text
        } else {
            // Handle cases where the response structure is unexpected
            console.error("Background: Unexpected Gemini API response format:", responseBody);
            throw new Error("Could not parse valid bid text from API response (unexpected format).");
        }
    } catch (error) {
        // Catch network errors (fetch failure) or errors thrown during processing
        console.error("Background: Error during Gemini API call or processing:", error);
        // Re-throw the error so it can be caught by the message listener and sent back
        // Prepend context to the error message for clarity
        throw new Error(`Gemini API Error: ${error.message}`);
    }
}

// --- Message Listener ---

/**
 * Listens for messages sent from other parts of the extension (e.g., content scripts).
 * Handles the 'callGemini' action.
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Check if the message action is the one we're interested in ('callGemini')
    if (request.action === "callGemini") {
        console.log("Background: Received 'callGemini' request from content script in tab:", sender.tab?.id);
        // The request should contain the extracted job description
        const jobDescription = request.description;

        if (!jobDescription) {
            console.error("Background: 'callGemini' request received without description.");
            // Send an error response back immediately if description is missing
            sendResponse({ status: "error", message: "Job description was missing in the request." });
            return false; // Indicate synchronous response
        }

        // Call the asynchronous function to interact with the Gemini API
        generateBidWithGemini(jobDescription)
            .then(bidText => {
                // --- Success Case ---
                console.log("Background: Successfully generated bid. Sending back to content script.");
                // Send the successful result back to the content script that made the request
                sendResponse({ status: "success", bid: bidText });
            })
            .catch(error => {
                // --- Error Case ---
                console.error("Background: Error during Gemini call processing:", error);
                // Send the error details back to the content script
                sendResponse({ status: "error", message: error.message || "An unknown error occurred during bid generation." });
            });

        // Return true to indicate that the sendResponse function will be called asynchronously
        // (after the generateBidWithGemini promise resolves or rejects). This is essential!
        return true;
    }

    // If the message action is not 'callGemini', ignore it.
    // Return false or undefined if this listener isn't handling the message asynchronously.
    return false;
});

// --- Extension Lifecycle Events ---

/**
 * Listens for the extension being installed or updated.
 * Useful for setting up initial state or guiding the user.
 */
chrome.runtime.onInstalled.addListener(details => {
    if (details.reason === "install") {
        console.log("Background: Extension installed.");
        // Open the options page automatically on first install to prompt for API key setup
        try {
            chrome.runtime.openOptionsPage();
        } catch (e) {
            console.error("Error opening options page on install:", e);
        }
    } else if (details.reason === "update") {
        const newVersion = chrome.runtime.getManifest().version;
        console.log(`Background: Extension updated to version ${newVersion}.`);
        // You could add logic here for migrations or notifications if needed
    }
});

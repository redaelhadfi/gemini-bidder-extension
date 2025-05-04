/**
 * content.js: Injected into matching web pages. Extracts data, inserts bids, communicates. (Debug v1.2 - Updated Selectors)
 */

// Log immediately to confirm script injection and start time
const scriptStartTime = Date.now();
console.log(`[Content] Script Injected & Running at ${new Date(scriptStartTime).toISOString()}.`);

/**
 * Extracts the job description text from the current web page's DOM.
 * !!! Selectors updated based on provided HTML structure !!!
 * @returns {string | null} The extracted job description text, or null if extraction fails.
 */
function extractJobDescription() {
    const funcStartTime = Date.now();
    console.log(`[Content] ---> extractJobDescription function started at ${new Date(funcStartTime).toISOString()}.`);
    let titleText = '';
    let descriptionBodyText = '';
    let skillsText = '';
    let combinedDescription = '';
    let foundAnyElement = false;

    // --- Selectors based on provided HTML ---
    const titleSelector = 'div.ProjectViewDetails-title[data-show-mobile="true"]';
    const descriptionSelector = 'div.ProjectDescription span.NativeElement';
    const skillsContainerSelector = 'div.ProjectViewDetailsSkills';
    const individualSkillSelector = 'fl-tag div.Content'; // Selector for the text inside each skill tag
    // --- End Selectors ---

    console.log(`[Content] extractJobDescription: Attempting to find Title with selector: '${titleSelector}'`);
    try {
        const titleElement = document.querySelector(titleSelector);
        if (titleElement) {
            titleText = (titleElement.innerText || titleElement.textContent || '').trim();
            console.log(`[Content] extractJobDescription: SUCCESS - Found Title. Text length: ${titleText.length}`);
            foundAnyElement = true;
        } else {
            console.log(`[Content] extractJobDescription: Title selector '${titleSelector}' did not match.`);
            // Fallback title selector if the mobile one isn't found/visible
            const desktopTitleSelector = 'h2.ng-star-inserted div.ProjectViewDetails-title';
            console.log(`[Content] extractJobDescription: Trying desktop title selector: '${desktopTitleSelector}'`);
            const desktopTitleElement = document.querySelector(desktopTitleSelector);
             if (desktopTitleElement) {
                titleText = (desktopTitleElement.innerText || desktopTitleElement.textContent || '').trim();
                console.log(`[Content] extractJobDescription: SUCCESS - Found Desktop Title. Text length: ${titleText.length}`);
                foundAnyElement = true;
             } else {
                 console.log(`[Content] extractJobDescription: Desktop title selector '${desktopTitleSelector}' also did not match.`);
             }
        }
    } catch (e) {
        console.error(`[Content] extractJobDescription: Error querying title selector '${titleSelector}':`, e);
    }

    console.log(`[Content] extractJobDescription: Attempting to find Description Body with selector: '${descriptionSelector}'`);
     try {
        const descriptionElement = document.querySelector(descriptionSelector);
        if (descriptionElement) {
            descriptionBodyText = (descriptionElement.innerText || descriptionElement.textContent || '').trim();
            console.log(`[Content] extractJobDescription: SUCCESS - Found Description Body. Text length: ${descriptionBodyText.length}`);
            foundAnyElement = true;
        } else {
            console.log(`[Content] extractJobDescription: Description body selector '${descriptionSelector}' did not match.`);
        }
    } catch (e) {
        console.error(`[Content] extractJobDescription: Error querying description selector '${descriptionSelector}':`, e);
    }

    console.log(`[Content] extractJobDescription: Attempting to find Skills Container with selector: '${skillsContainerSelector}'`);
     try {
        const skillsContainer = document.querySelector(skillsContainerSelector);
        if (skillsContainer) {
             console.log(`[Content] extractJobDescription: SUCCESS - Found skills container. Querying individual skills with selector: '${individualSkillSelector}'`);
             const skillTags = skillsContainer.querySelectorAll(individualSkillSelector);
             console.log(`[Content] extractJobDescription: Found ${skillTags.length} potential skill tag elements.`);
             const skills = Array.from(skillTags)
                                .map(tag => (tag.innerText || tag.textContent || '').trim())
                                .filter(Boolean); // Filter out empty strings

             if (skills.length > 0) {
                skillsText = "Skills: " + skills.join(', ');
                console.log(`[Content] extractJobDescription: Extracted skills: ${skills.join(', ')}`);
                foundAnyElement = true;
             } else {
                 console.log(`[Content] extractJobDescription: Skills container found, but no skill text matched the inner selector '${individualSkillSelector}'.`);
             }
        } else {
             console.log(`[Content] extractJobDescription: Skills container selector '${skillsContainerSelector}' did not match.`);
        }
     } catch (e) {
         console.error(`[Content] extractJobDescription: Error querying skills selector '${skillsContainerSelector}' or processing skills:`, e);
     }

    // Combine the extracted parts
    if (titleText) {
        combinedDescription += titleText + "\n\n";
    }
    if (descriptionBodyText) {
         combinedDescription += descriptionBodyText + "\n\n";
    }
     if (skillsText) {
         combinedDescription += skillsText;
    }

    combinedDescription = combinedDescription.trim();

    if (!foundAnyElement || !combinedDescription) {
        console.error("[Content] extractJobDescription: FINAL RESULT - EXTRACTION FAILED. Could not extract sufficient information with the current selectors.");
        console.log(`[Content] ---< extractJobDescription function finished (FAILED) at ${new Date().toISOString()}. Duration: ${Date.now() - funcStartTime}ms`);
        return null; // Indicate failure
    }

    console.log("[Content] extractJobDescription: FINAL RESULT - Extraction successful.");
    console.log("[Content] extractJobDescription: Final Combined Text (first 500 chars):\n", combinedDescription.substring(0, 500) + (combinedDescription.length > 500 ? '...' : ''));
    console.log(`[Content] ---< extractJobDescription function finished (SUCCESS) at ${new Date().toISOString()}. Duration: ${Date.now() - funcStartTime}ms`);
    return combinedDescription;
}

/**
 * Inserts the provided bid text into the target textarea on the page.
 * !!! Selector based on initial user input - VERIFY IF STILL CORRECT !!!
 * @param {string} bidText - The generated bid text to insert.
 * @returns {boolean} True if insertion was successful, false otherwise.
 */
function insertBid(bidText) {
     const funcStartTime = Date.now();
    console.log(`[Content] ---> insertBid function started at ${new Date(funcStartTime).toISOString()}.`);
    // --- !!! VERIFY THIS SELECTOR !!! ---
    // This selector is based on the HTML snippet you provided in the *first* message.
    // Inspect the bid input field on the actual page to confirm this is correct.
    const bidTextAreaSelector = 'textarea#descriptionTextArea';

    console.log(`[Content] insertBid: Attempting to find textarea with selector: '${bidTextAreaSelector}'`);

    let bidTextArea = null;
    try {
         bidTextArea = document.querySelector(bidTextAreaSelector);
    } catch (e) {
         console.error(`[Content] insertBid: Error querying textarea selector '${bidTextAreaSelector}':`, e);
         console.log(`[Content] ---< insertBid function finished (FAILED - Query Error) at ${new Date().toISOString()}. Duration: ${Date.now() - funcStartTime}ms`);
         return false;
    }

    if (bidTextArea) {
        console.log(`[Content] insertBid: SUCCESS - Found bid textarea.`);
        try {
            console.log("[Content] insertBid: Setting textarea value...");
            bidTextArea.value = bidText;
            console.log("[Content] insertBid: Value set. Dispatching input event...");
            bidTextArea.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
             console.log("[Content] insertBid: Dispatching change event...");
            bidTextArea.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
             console.log("[Content] insertBid: Dispatching blur event...");
            bidTextArea.dispatchEvent(new Event('blur', { bubbles: true, cancelable: true }));
            console.log("[Content] insertBid: FINAL RESULT - Bid text inserted and events dispatched successfully.");
             console.log(`[Content] ---< insertBid function finished (SUCCESS) at ${new Date().toISOString()}. Duration: ${Date.now() - funcStartTime}ms`);
            return true;
        } catch (e) {
             console.error("[Content] insertBid: Error setting value or dispatching events:", e);
             console.log(`[Content] ---< insertBid function finished (FAILED - Event/Value Error) at ${new Date().toISOString()}. Duration: ${Date.now() - funcStartTime}ms`);
             return false;
        }
    } else {
        console.error(`[Content] insertBid: FINAL RESULT - INSERTION FAILED. Could not find the bid textarea using selector '${bidTextAreaSelector}'. Please inspect the page HTML and update the selector in content.js.`);
         console.log(`[Content] ---< insertBid function finished (FAILED - Not Found) at ${new Date().toISOString()}. Duration: ${Date.now() - funcStartTime}ms`);
        return false;
    }
}

// --- Message Listener (No changes needed here) ---
if (!window.hasGeminiBidContentListenerEnhanced) {
    window.hasGeminiBidContentListenerEnhanced = true;
    console.log("[Content] Setting up chrome.runtime.onMessage listener...");

    try {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            const messageStartTime = Date.now();
            console.log(`[Content] === Message Received === at ${new Date(messageStartTime).toISOString()}`);
            console.log(`[Content] Message Action: '${request.action}'`);
            // console.log("[Content] Message Request Object:", request); // Can be verbose
            // console.log("[Content] Message Sender Object:", sender); // Can be verbose

            let isAsync = false; // Flag to track if sendResponse will be called later

            if (request.action === "getJobDescription") {
                console.log("[Content] Message Handler: Matched action 'getJobDescription'.");
                console.log("[Content] Message Handler: Calling extractJobDescription()...");
                const jobDescription = extractJobDescription(); // Calls the function above

                if (jobDescription) {
                    console.log("[Content] Message Handler: Description extracted successfully.");
                    console.log("[Content] Message Handler: Sending 'callGemini' message to background script...");
                    // Send description to background script
                    chrome.runtime.sendMessage({ action: "callGemini", description: jobDescription }, (response) => {
                        // This callback runs when the background script responds
                        const responseReceivedTime = Date.now();
                        console.log(`[Content] === Background Response Received === at ${new Date(responseReceivedTime).toISOString()}. Duration: ${responseReceivedTime - messageStartTime}ms`);
                        if (chrome.runtime.lastError) {
                            console.error("[Content] Background Response Callback: ERROR - chrome.runtime.lastError:", chrome.runtime.lastError.message);
                            const errorResponse = { status: "error", message: `Background script communication error: ${chrome.runtime.lastError.message}` };
                            console.log("[Content] Background Response Callback: Sending error response back to popup:", errorResponse);
                            sendResponse(errorResponse);
                            return; // Stop execution here
                        }
                        console.log("[Content] Background Response Callback: Received response from background:", response);
                        console.log("[Content] Background Response Callback: Relaying this response back to popup...");
                        sendResponse(response); // Forward the exact response object
                        console.log("[Content] Background Response Callback: sendResponse called for popup.");
                    });
                    console.log("[Content] Message Handler: sendMessage to background called. Setting async flag to true.");
                    isAsync = true; // Indicate asynchronous response needed
                } else {
                    // Extraction failed
                    console.error("[Content] Message Handler: Extraction failed. Preparing error response for popup.");
                    const errorResponse = { status: "error", message: "Failed to extract job description from page. Check selectors in content.js and page console." };
                    console.log("[Content] Message Handler: Sending error response synchronously to popup:", errorResponse);
                    sendResponse(errorResponse);
                    // isAsync remains false
                }

            } else if (request.action === "insertGeneratedBid") {
                console.log("[Content] Message Handler: Matched action 'insertGeneratedBid'.");
                if (request.bidText) {
                    console.log("[Content] Message Handler: Bid text found in request. Calling insertBid()...");
                    if (insertBid(request.bidText)) { // Calls the function above
                        console.log("[Content] Message Handler: insertBid returned success. Preparing success response for popup.");
                        const successResponse = { status: "success" };
                        console.log("[Content] Message Handler: Sending success response synchronously to popup:", successResponse);
                        sendResponse(successResponse);
                    } else {
                        console.error("[Content] Message Handler: insertBid returned failure. Preparing error response for popup.");
                        const errorResponse = { status: "error", message: "Failed to insert bid into textarea. Check selector in content.js and page console." };
                        console.log("[Content] Message Handler: Sending error response synchronously to popup:", errorResponse);
                        sendResponse(errorResponse);
                    }
                } else {
                    console.error("[Content] Message Handler: 'insertGeneratedBid' request missing bidText. Preparing error response for popup.");
                     const errorResponse = { status: "error", message: "Bid text was missing in the insertion request." };
                    console.log("[Content] Message Handler: Sending error response synchronously to popup:", errorResponse);
                    sendResponse(errorResponse);
                }
                 // isAsync remains false

            } else {
                 console.warn(`[Content] Message Handler: Received unknown message action: '${request.action}'. No action taken.`);
                 // Optionally send an error back for unknown actions
                 // sendResponse({ status: "error", message: `Unknown action received: ${request.action}` });
                 // isAsync remains false
            }

            console.log(`[Content] Message Handler: Finished processing action '${request.action}'. Returning ${isAsync} for async.`);
            // Return true if sendResponse will be called asynchronously later, false otherwise.
            return isAsync;
        });

        console.log("[Content] Message listener added successfully.");

    } catch (e) {
        console.error("[Content] CRITICAL ERROR setting up message listener:", e);
    }

} else {
     console.warn("[Content] Listener flag (hasGeminiBidContentListenerEnhanced) already set. Skipping addListener setup.");
}

console.log(`[Content] Script execution finished at ${new Date().toISOString()}. Total time: ${Date.now() - scriptStartTime}ms`);

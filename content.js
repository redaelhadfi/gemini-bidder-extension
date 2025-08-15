/**
 * content.js: Injected into matching web pages.
 * - Extracts job details (description, budget, suggested bid/time).
 * - Fills the bid form on the page.
 * - Listens for messages from the popup.
 *
 * Final Version: 2.1 - Includes robust selectors and connection handling.
 */
console.log("[Content] Script Injected & Running (v2.1)");

/**
 * Extracts all relevant job details from the Freelancer project page.
 * @returns {Promise<object>} A promise that resolves with an object containing all extracted data.
 */
async function extractJobDetails() {
    console.log("[Content] ---> Starting job detail extraction...");

    const data = {
        description: null,
        bidAmount: null,
        deliveryTime: null,
        projectBudget: { text: null, min: null, max: null }
    };

    // --- Selectors for Page Elements ---
    const selectors = {
        title: 'h2.ProjectViewDetails-title',
        description: 'div.ProjectDescription span.NativeElement',
        skills: 'div.ProjectViewDetailsSkills fl-tag',
        budget: 'p.ProjectViewDetails-budget',
        suggestedBidText: 'div.EarningExplainer div.NativeElement',
        bidAmountInput: 'input#bidAmountInput',
        deliveryTimeInput: 'input#periodInput'
    };

    const queryAny = (selectorList) => {
        for (const sel of selectorList) {
            const el = document.querySelector(sel);
            if (el) return el;
        }
        return null;
    };

    // 1. --- Extract Job Title, Description, and Skills ---
    try {
        const titleElement = document.querySelector(selectors.title);
        const descriptionElement = document.querySelector(selectors.description);
        const skillElements = document.querySelectorAll(selectors.skills);

        let combinedDescription = "";
        if (titleElement) {
            const titleText = titleElement.innerText.trim();
            // Avoid adding the generic "Project Details" page title
            if (titleText.toLowerCase() !== 'project details') {
                combinedDescription += titleText + "\n\n";
            }
        }
        if (descriptionElement) {
            combinedDescription += descriptionElement.innerText.trim() + "\n\n";
        }
        if (skillElements.length > 0) {
            const skills = Array.from(skillElements).map(el => el.innerText.trim()).filter(Boolean);
            if (skills.length > 0) {
                combinedDescription += "Skills: " + skills.join(', ');
            }
        }
        data.description = combinedDescription.trim() || null;

        if (!data.description) {
            console.error("[Content] Failed to extract the core job description.");
        }
    } catch (e) {
        console.error("[Content] Error during description extraction:", e);
    }

    // 2. --- Extract Project Budget (e.g., "$250 - $750 USD") ---
    const budgetElement = document.querySelector(selectors.budget);
    if (budgetElement) {
        data.projectBudget.text = budgetElement.innerText.trim();
        // Extract all numbers from the budget text to find min/max
        const numbers = data.projectBudget.text.match(/[\d,]+(\.\d+)?/g);
        if (numbers) {
            const numericValues = numbers.map(val => parseFloat(val.replace(/,/g, '')));
            data.projectBudget.min = Math.min(...numericValues);
            data.projectBudget.max = Math.max(...numericValues);
        }
        console.log(`[Content] Extracted Budget:`, data.projectBudget);
    }

    // 3A. --- Prefer Default Bid Amount from Input (Freelancer's default)
    const bidAmountInputEl = queryAny([
        selectors.bidAmountInput,
        'input[name="bidAmount"]',
        'input[name="amount"]',
        'input[id*="bid"][type="number"]',
        'input[id*="amount"][type="number"]',
        'fl-input[formcontrolname="amount"] input'
    ]);
    if (bidAmountInputEl && bidAmountInputEl.value) {
        const numeric = parseFloat(String(bidAmountInputEl.value).replace(/,/g, ''));
        if (!Number.isNaN(numeric)) {
            data.bidAmount = numeric;
            console.log(`[Content] SUCCESS: Extracted default bid amount from input: ${data.bidAmount}`);
        }
    }
    // 3B. --- Fallback: Extract Suggested Bid Amount from helper text
    if (data.bidAmount === null) {
        let textCandidate = null;
        const suggestedBidElement = document.querySelector(selectors.suggestedBidText);
        if (suggestedBidElement) {
            textCandidate = suggestedBidElement.innerText;
        }
        if (!textCandidate) {
            // Broad search for a line containing "Paid to you" or currency-like text near the form
            const nodes = Array.from(document.querySelectorAll('div, p, span'));
            const hit = nodes.find(n => /Paid to you|Your bid|You will receive/i.test(n.innerText || ''));
            if (hit) textCandidate = hit.innerText;
        }
        if (textCandidate) {
            const match = textCandidate.match(/[\d][\d,]*\.?\d{0,2}/);
            if (match && match[0]) {
                data.bidAmount = parseFloat(match[0].replace(/,/g, ''));
                console.log(`[Content] SUCCESS: Extracted suggested bid amount: ${data.bidAmount}`);
            } else {
                console.warn(`[Content] Could not parse a number from suggested text: "${textCandidate}"`);
            }
        } else {
            console.warn('[Content] No suggested bid text found.');
        }
    }

    // 4. --- Extract Default Delivery Time (from its input field) ---
    const deliveryTimeInputEl = queryAny([
        selectors.deliveryTimeInput,
        'input[name="period"]',
        'input[id*="period"][type="number"]',
        'input[id*="days"][type="number"]',
        'fl-input[formcontrolname="period"] input'
    ]);
    if (deliveryTimeInputEl && deliveryTimeInputEl.value) {
        const parsed = parseInt(deliveryTimeInputEl.value, 10);
        if (!Number.isNaN(parsed)) data.deliveryTime = parsed;
        console.log(`[Content] SUCCESS: Extracted default delivery time: ${data.deliveryTime}`);
    } else {
        console.warn(`[Content] Delivery time input field not found or is empty with selector: '${selectors.deliveryTimeInput}'`);
    }

    console.log(`[Content] ---< Extraction finished. Final data:`, data);
    return data;
}

/**
 * Inserts the provided data into the bid form fields on the page.
 * @param {object} bidData - The data object from the popup.
 * @returns {boolean} True if the main description field was filled, false otherwise.
 */
function fillBidForm(bidData) {
    console.log("[Content] Attempting to fill bid form with data:", bidData);

    const setInputValue = (selector, value) => {
        const inputElement = document.querySelector(selector);
        if (inputElement && value !== null && value !== undefined) {
            inputElement.value = value;
            // Dispatch events to ensure the website's framework (e.g., Angular, React) recognizes the change
            ['input', 'change', 'blur'].forEach(eventName => {
                inputElement.dispatchEvent(new Event(eventName, { bubbles: true }));
            });
            console.log(`[Content] Successfully set value for '${selector}'.`);
            return true;
        }
        console.warn(`[Content] Could not find or set value for selector: '${selector}'.`);
        return false;
    };

    let success = setInputValue('textarea#descriptionTextArea', bidData.bidText);
    setInputValue('input#bidAmountInput', bidData.bidAmount);
    setInputValue('input#periodInput', bidData.deliveryTime);

    // Handle checkboxes if upgrade data is provided
    if (bidData.upgrades) {
        // This logic can be expanded if needed
    }

    return success;
}


// --- Global Message Listener ---
// Use a unique flag to prevent the listener from being added multiple times on script re-injection.
if (!window.geminiBidListenerFinal) {
    window.geminiBidListenerFinal = true;
    console.log("[Content] Setting up message listener (Final Version)...");

    function fillQuestionsForm(questionsText) {
        if (!questionsText || typeof questionsText !== 'string') return false;
        const candidateSelectors = [
            'textarea[placeholder="Ask a question..."]',
            '.CommentForm-contentAndActions textarea',
            'fl-textarea textarea',
        ];
        let textarea = null;
        for (const sel of candidateSelectors) {
            const el = document.querySelector(sel);
            if (el) { textarea = el; break; }
        }
        if (!textarea) return false;
        textarea.value = questionsText;
        ['input', 'change', 'blur'].forEach(eventName => textarea.dispatchEvent(new Event(eventName, { bubbles: true })));
        return true;
    }

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        console.log(`[Content] Received message with action: '${request.action}'`);

        // 1. Respond to connection checks from the popup
        if (request.action === "ping") {
            sendResponse({ status: "alive" });
            return; // End immediately, no async here.
        }

        // 2. Handle request to extract data
        if (request.action === "getJobDescription") {
            extractJobDetails().then(jobDetails => {
                // Forward the extracted details to the background script for processing
                chrome.runtime.sendMessage({
                    action: "callGemini", // This tells the background script to call the Gemini API
                    ...jobDetails
                }, response => {
                    // This callback receives the final response from the background script
                    // (which includes the generated bid) and forwards it back to the popup.
                    if (chrome.runtime.lastError) {
                        console.error("[Content] Error sending message to background:", chrome.runtime.lastError.message);
                        sendResponse({ status: 'error', message: 'Could not communicate with the background script.' });
                    } else {
                        // Include original page-derived details for downstream usage (e.g., questions)
                        sendResponse({ ...response, description: jobDetails.description, extractedProjectBudget: jobDetails.projectBudget });
                    }
                });
            }).catch(error => {
                console.error("[Content] Unexpected error in extractJobDetails:", error);
                sendResponse({ status: 'error', message: `Content script error: ${error.message}` });
            });
            return true; // Return true to indicate an asynchronous response.
        }

        // 2.b Return only extracted details without calling background (for questions flow)
        if (request.action === "getJobDetails") {
            extractJobDetails().then(jobDetails => {
                sendResponse({ status: 'success', ...jobDetails });
            }).catch(error => {
                console.error("[Content] Unexpected error in getJobDetails:", error);
                sendResponse({ status: 'error', message: `Content script error: ${error.message}` });
            });
            return true;
        }

        // 3. Handle request to fill the form
        if (request.action === "fillBidForm") {
            if (request.bidData) {
                const success = fillBidForm(request.bidData);
                sendResponse({ status: success ? "success" : "error" });
            } else {
                sendResponse({ status: "error", message: "No bidData was provided to fill the form." });
            }
            // This is synchronous, but returning true doesn't hurt.
            return true;
        }
        
        if (request.action === 'fillQuestions') {
            const ok = fillQuestionsForm(request.questionsText || '');
            sendResponse({ status: ok ? 'success' : 'error' });
            return true;
        }
    });
}
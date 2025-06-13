// Background script to handle API requests and bypass CORS/referer restrictions
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "makeApiRequest") {
    const { url, body } = request;
    
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })
    .then(response => response.json())
    .then(data => {
      sendResponse({ success: true, data });
    })
    .catch(error => {
      sendResponse({ success: false, error: error.message });
    });
    
    return true; // Indicates that the response is asynchronous
  }
});

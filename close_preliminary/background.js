chrome.action.onClicked.addListener((tab) => {
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: executeContentScript
  });
});

function executeContentScript() {
  console.log("Executing content script");
}
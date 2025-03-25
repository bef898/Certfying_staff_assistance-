document.addEventListener('DOMContentLoaded', () => {
  const sentenceInput = document.getElementById('sentenceInput');
  const repeatCountInput = document.getElementById('repeatCount');
  const lastSentenceInput = document.getElementById('lastSentence');
  const startProcessBtn = document.getElementById('startProcess');

  // Retrieve last sentence from storage
  chrome.storage.sync.get('lastSentence', (data) => {
    if (data.lastSentence) {
      lastSentenceInput.value = data.lastSentence;
    }
  });

  startProcessBtn.addEventListener('click', () => {
    const sentence = sentenceInput.value.trim();
    const repeatCount = parseInt(repeatCountInput.value, 10);

    if (!sentence) {
      alert("Please enter a sentence.");
      return;
    }

    // Save last sentence
    chrome.storage.sync.set({ lastSentence: sentence });

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: startAutofillProcess,
        args: [sentence, repeatCount]
      });
    });
  });
});

function startAutofillProcess(sentence, repeatCount) {
  const MIN_WIDTH = 300;
  const MIN_HEIGHT = 100;
  const textInputs = Array.from(document.querySelectorAll('textarea, input[type="text"]')).filter(input => {
    const style = window.getComputedStyle(input);
    const rect = input.getBoundingClientRect();
    return style.display !== 'none' && style.visibility !== 'hidden' &&
      input.offsetParent !== null && !input.disabled && !input.readOnly &&
      (rect.width >= MIN_WIDTH || rect.height >= MIN_HEIGHT);
  });

  for (let i = 0; i < textInputs.length && i < repeatCount; i++) {
    const input = textInputs[i];
    input.focus();
    input.value = sentence;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    input.style.outline = '2px solid #28a745';
    input.style.backgroundColor = '#eaffea';
  }

  const checkboxes = Array.from(document.querySelectorAll('input[type="checkbox"]')).filter(checkbox => {
    const style = window.getComputedStyle(checkbox);
    return style.display !== 'none' && style.visibility !== 'hidden' &&
      checkbox.offsetParent !== null && !checkbox.disabled;
  });

  checkboxes.forEach(checkbox => {
    if (!checkbox.checked) {
      checkbox.click();
    }
  });

  const completeAllBtn = document.getElementById('idButtonCompleteAll');
  if (completeAllBtn) completeAllBtn.click();

  setTimeout(() => {
    const okBtn = document.getElementById('idButtonOk');
    if (okBtn) okBtn.click();
  }, 1000);
} 

// ======= content.js =======
(function() {
  if (window.location.href.includes('TaskDetails.jsp')) {
    const cancelButton = document.getElementById('idButtonCancel');
    if (cancelButton) cancelButton.click();
  }
})();

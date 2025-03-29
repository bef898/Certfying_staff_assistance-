document.addEventListener('DOMContentLoaded', () => {
  const sentenceContainer = document.getElementById('sentenceContainer');
  const addSentenceBtn = document.getElementById('addSentence');
  const startProcessBtn = document.getElementById('startProcess');

  chrome.storage.sync.get('sentences', (data) => {
    const sentences = data.sentences || [];
    sentences.forEach(({ sentence, count }) => addSentenceRow(sentence, count));
  });

  addSentenceBtn.addEventListener('click', () => addSentenceRow('', 1));

  startProcessBtn.addEventListener('click', () => {
    const rows = sentenceContainer.querySelectorAll('.sentenceRow');
    const sentences = Array.from(rows).map(row => ({
      sentence: row.querySelector('.sentenceInput').value,
      count: parseInt(row.querySelector('.repeatInput').value, 10)
    }));
    chrome.storage.sync.set({ sentences });
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: startAutofillProcess,
        args: [sentences]
      });
    });
  });

  function addSentenceRow(sentence = '', count = 1) {
    const div = document.createElement('div');
    div.className = 'sentenceRow';
    div.style.display = 'flex';
    div.style.marginBottom = '5px';
    div.innerHTML = `
      <input type="text" class="sentenceInput" placeholder="Sentence" value="${sentence}" style="flex: 2; margin-right: 5px;" />
      <input type="number" class="repeatInput" placeholder="Repeat" min="1" value="${count}" style="flex: 1;" />`;
    sentenceContainer.appendChild(div);
  }
});

function startAutofillProcess(sentences) {
  const MIN_WIDTH = 300;
  const MIN_HEIGHT = 100;
  const textInputs = Array.from(document.querySelectorAll('textarea, input[type="text"]')).filter(input => {
    const style = window.getComputedStyle(input);
    const rect = input.getBoundingClientRect();
    return style.display !== 'none' && style.visibility !== 'hidden' &&
      input.offsetParent !== null && !input.disabled && !input.readOnly &&
      (rect.width >= MIN_WIDTH || rect.height >= MIN_HEIGHT);
  });

  let index = 0;
  sentences.forEach(({ sentence, count }) => {
    for (let i = 0; i < count && index < textInputs.length; i++) {
      const input = textInputs[index];
      input.focus();
      input.value = sentence;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      input.style.outline = '2px solid #28a745';
      input.style.backgroundColor = '#eaffea';
      index++;
    }
  });

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

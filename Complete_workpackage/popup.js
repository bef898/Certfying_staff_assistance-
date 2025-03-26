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
      <input type="number" class="repeatInput" placeholder="Repeat" min="1" value="${count}" style="flex: 1;" />
      <button class="removeSentence">X</button>
    `;
    div.querySelector('.removeSentence').addEventListener('click', () => div.remove());
    sentenceContainer.appendChild(div);
  }
});
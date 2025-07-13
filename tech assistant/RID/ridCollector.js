function collectRSVWords() {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.scripting.executeScript({
      target: {tabId: tabs[0].id},
      func: () => {
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        let node, words = [];
        while (node = walker.nextNode()) {
          const found = node.textContent.match(/\bRSV\w*\b/g);
          if (found) words.push(...found);
        }
        return words.join(', ');
      }
    }, (results) => {
      const rids = results[0].result;
      if (rids) {
        window.prompt('Copy RSV words:', rids);
      } else {
        alert('No RSV words found on this page.');
      }
    });
  });
}
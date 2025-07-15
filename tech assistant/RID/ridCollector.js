function collectAndAutomateRSV() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tabId = tabs[0].id;

    // Step 1: Extract RSV Words
    chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        let node, words = [];
        while (node = walker.nextNode()) {
          const found = node.textContent.match(/\bRSV\w*\b/gi);
          if (found) words.push(...found.map(w => w.toUpperCase()));
        }
        return [...new Set(words)].join(',');
      }
    }, (results) => {
      const rsvWords = results[0].result;
      if (!rsvWords) {
        alert("No RSV words found.");
        return;
      }

      // Step 2: Navigate through menu up to the new page
      chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
          const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
          const debugElements = (selector) => {
            const elements = document.querySelectorAll(selector);
            console.log(`Found ${elements.length} elements with selector "${selector}":`);
            elements.forEach((el, i) => {
              console.log(`[${i}]`, el.textContent.trim(), el.outerHTML);
            });
            return elements;
          };

          (async () => {
            try {
              const menuButton = document.querySelector('span#idMenuButton');
              if (!menuButton) throw new Error("Menu button not found.");
              menuButton.click();
              await wait(2000);

              const allMenuItems = debugElements('a.menu-anchor.menu-link, a.menu-link');

              let targetReport = Array.from(allMenuItems).find(el => 
                el.textContent.trim() === "ETH Custom Reports [P-Z]" ||
                (el.textContent.includes("ETH Custom Reports") && el.textContent.includes("[P-Z]"))
              );
              if (!targetReport) throw new Error("ETH Custom Reports [P-Z] not found.");
              targetReport.click();
              await wait(2000);

              let targetReportwh = Array.from(allMenuItems).find(el =>
                el.textContent.trim() === "WH-Material Requisition Format" ||
                (el.textContent.includes("WH-Material") && el.textContent.includes("Requisition Format"))
              );
              if (!targetReportwh) throw new Error("WH-Material Requisition Format not found.");
              targetReportwh.click();
            } catch (err) {
              alert("Navigation error: " + err.message);
            }
          })();
        }
      });

      // Step 3: Wait for new page, then inject form-filling logic
      const checkInterval = setInterval(() => {
        chrome.scripting.executeScript({
          target: { tabId },
          func: () => {
            return !!document.querySelector('input#pRequestId');
          }
        }, (res) => {
          if (res[0].result === true) {
            clearInterval(checkInterval);

            chrome.scripting.executeScript({
              target: { tabId },
              func: (rsvWords) => {
                try {
                  const requestIdField = document.querySelector('input#pRequestId');
                  if (!requestIdField) throw new Error("Request ID field not found.");
                  requestIdField.value = rsvWords;

                  const excelDropdown = document.querySelector('input#aView');
                  if (!excelDropdown) throw new Error("Excel dropdown not found.");
                  excelDropdown.value = "Excel";
                  excelDropdown.dispatchEvent(new Event('change'));

                  const generateButton = document.querySelector('span.largeButtonTextCell');
                  if (!generateButton) throw new Error("Generate button not found.");
                  generateButton.click();

                  //alert("Success! Report generated in Excel format.");
                } catch (err) {
                  alert("Form fill error: " + err.message);
                }
              },
              args: [rsvWords]
            });
          }
        });
      }, 1000); // Check every 1 second
    });
  });
}

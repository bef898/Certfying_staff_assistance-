(function() {
  function clickButtonByText(text) {
    let buttons = document.querySelectorAll("button, a");
    for (let btn of buttons) {
      if (btn.textContent.trim().includes(text)) {
        btn.click();
        return true;
      }
    }
    return false;
  }

  function waitForElement(selector, callback) {
    let observer = new MutationObserver(() => {
      let element = document.querySelector(selector);
      if (element) {
        console.log(`Element found: ${selector}`);
        observer.disconnect();
        callback(element);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (clickButtonByText("My Tasks")) {
    waitForElement("a[href^='TSFN']", (taskLink) => {
      taskLink.click();
      waitForElement("tr", () => {
        let rows = document.querySelectorAll("tr");
        for (let row of rows) {
          if (row.innerText.includes("INSP-SHP")) {
            let finishButton = row.querySelector("button");
            if (finishButton) {
              finishButton.click();
              waitForElement("input[type='password']", (passwordField) => {
                chrome.storage.sync.get("savedPassword", ({ savedPassword }) => {
                  passwordField.value = savedPassword || "default_password";
                  passwordField.dispatchEvent(new Event("input"));
                });
              });
              setTimeout(() => {
                let textAreas = Array.from(document.querySelectorAll("textarea"))
                  .filter(area => area.clientHeight > 50);
                let userSentence = prompt("Enter a sentence:");
                textAreas.forEach(area => {
                  area.value = userSentence;
                  area.dispatchEvent(new Event("input"));
                });
                clickButtonByText("OK");
              }, 2000);
            }
          }
        }
      });
    });
  }
})();

//content.js
(function() {
    if (window.location.href.includes('TaskDetails.jsp')) {
      const cancelButton = document.getElementById('idButtonCancel');
      if (cancelButton) cancelButton.click();
    }
  })();
  (function() {
    if (window.location.href.includes('TaskDetails.jsp')) {
      const closeButton = document.getElementById('idButtonClose');
      if (closeButton) closeButton.click();
    }
  })();
  setTimeout(() => {
    const observer = new MutationObserver(() => {
      const cancelBtn = document.querySelector('idButtonClose'); // Find the "Close" button by its ID
      if (cancelBtn) {
        // Trigger the onclick event manually by simulating a click
        cancelBtn.click();
        console.log('Cancel (Close) button clicked');
        observer.disconnect(); // Stop observing after clicking
      }
    });
  
    observer.observe(document.body, { childList: true, subtree: true });
  }, 2000);
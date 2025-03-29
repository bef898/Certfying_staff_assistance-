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
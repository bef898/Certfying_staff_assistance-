document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('textFileInput');
    const fileName = document.getElementById('fileName');
    const fillButton = document.getElementById('fillFields');
    const statusDiv = document.getElementById('status');
    const checkCheckboxes = document.getElementById('checkCheckboxes');
    const largeFieldsOnly = document.getElementById('largeFieldsOnly');
    const setPartialDropdowns = document.getElementById('setPartialDropdowns');
  
    // Update file name display
    fileInput.addEventListener('change', () => {
      if (fileInput.files.length) {
        fileName.textContent = fileInput.files[0].name;
        showStatus('File ready for processing', 'info');
      } else {
        fileName.textContent = 'Choose sentences file';
      }
    });
  
    fillButton.addEventListener('click', async () => {
      if (!fileInput.files.length) {
        showStatus('Please select a text file first', 'error');
        return;
      }
  
      try {
        fillButton.disabled = true;
        fillButton.innerHTML = '<span class="button-text">Processing...</span><svg class="button-icon spinner" viewBox="0 0 24 24"><path d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z"/></svg>';
        
        const file = fileInput.files[0];
        const text = await file.text();
        const sentences = text.split('\n').filter(line => line.trim() !== '');
        
        if (sentences.length === 0) {
          showStatus('No sentences found in the file', 'error');
          return;
        }
  
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: automateForm,
          args: [sentences, {
            checkCheckboxes: checkCheckboxes.checked,
            largeFieldsOnly: largeFieldsOnly.checked,
            setPartialDropdowns: setPartialDropdowns.checked
          }]
        });
  
        const { fieldsFilled, checkboxesChecked, dropdownsSet } = results[0].result;
        let message = `Filled ${fieldsFilled} text fields`;
        if (checkboxesChecked > 0) message += `, checked ${checkboxesChecked} checkboxes`;
        if (dropdownsSet > 0) message += `, set ${dropdownsSet} dropdowns to "Partial"`;
        
        showStatus(message, 'success');
      } catch (err) {
        showStatus('Error: ' + err.message, 'error');
        console.error(err);
      } finally {
        fillButton.disabled = false;
        fillButton.innerHTML = '<span class="button-text">Fill Fields</span><svg class="button-icon" viewBox="0 0 24 24"><path d="M5,20H19V18H5M19,9H15V3H9V9H5L12,16L19,9Z"/></svg>';
      }
    });
  
    function showStatus(message, type) {
      statusDiv.textContent = message;
      statusDiv.className = 'status-message';
      statusDiv.classList.add(`status-${type}`);
    }
  });
  
  function automateForm(sentences, options) {
    // 1. Fill text fields
    let fieldsFilled = 0;
    const textFields = options.largeFieldsOnly 
      ? [...document.querySelectorAll('textarea, input[type="text"], [contenteditable="true"]')]
          .filter(field => field.offsetWidth * field.offsetHeight > 2000 && field.offsetWidth > 0)
          .sort((a, b) => (b.offsetWidth * b.offsetHeight) - (a.offsetWidth * a.offsetHeight))
      : [...document.querySelectorAll('textarea, input[type="text"]')]
          .filter(field => field.offsetWidth > 0);
  
    fieldsFilled = Math.min(textFields.length, sentences.length);
    for (let i = 0; i < fieldsFilled; i++) {
      textFields[i].value = sentences[i];
      textFields[i].dispatchEvent(new Event('input', { bubbles: true }));
      textFields[i].dispatchEvent(new Event('change', { bubbles: true }));
    }
  
    // 2. Check checkboxes
    let checkboxesChecked = 0;
    if (options.checkCheckboxes) {
      const checkboxes = [...document.querySelectorAll('input[type="checkbox"]')]
        .filter(checkbox => !checkbox.disabled && !checkbox.checked);
      
      checkboxesChecked = checkboxes.length;
      checkboxes.forEach(checkbox => {
        checkbox.checked = true;
        checkbox.dispatchEvent(new Event('change', { bubbles: true }));
      });
    }
  
    // 3. Set dropdowns to "Partial"
    let dropdownsSet = 0;
    if (options.setPartialDropdowns) {
      const dropdowns = [...document.querySelectorAll('select')]
        .filter(dropdown => !dropdown.disabled);
      
      dropdowns.forEach(dropdown => {
        const partialOption = [...dropdown.options].find(option => 
          option.text.toLowerCase().includes('partial') || 
          option.value.toLowerCase().includes('partial')
        );
        
        if (partialOption && dropdown.value !== partialOption.value) {
          dropdown.value = partialOption.value;
          dropdown.dispatchEvent(new Event('change', { bubbles: true }));
          dropdownsSet++;
        }
      });
    }
  
    return { fieldsFilled, checkboxesChecked, dropdownsSet };
  }
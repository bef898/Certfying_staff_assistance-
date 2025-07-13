function scheduleWorkPackage() {
  let isfnWord = prompt('Enter the ISFN word (starts with "ISFN"):');
  if (!isfnWord || !/^ISFN\w*/i.test(isfnWord)) {
    alert('Please enter a valid word starting with "ISFN".');
    return;
  }

  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.scripting.executeScript({
      target: {tabId: tabs[0].id},
      args: [isfnWord],
      func: (isfn) => {
        const input = document.getElementById('idBarcodeSearchInput');
        if (input) {
          input.value = isfn;
          input.dispatchEvent(new Event('input', { bubbles: true }));

          // Try submitting the form if input is inside a form
          if (input.form) {
            input.form.submit();
            return {status: 'inserted', isfn: isfn, method: 'form'};
          }

          // Try triggering Enter key events
          input.focus();
          const enterEvent = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Enter', code: 'Enter', keyCode: 13 });
          input.dispatchEvent(enterEvent);

          // Also try triggering 'change' event
          input.dispatchEvent(new Event('change', { bubbles: true }));

          return {status: 'inserted', isfn: isfn, method: 'event'};
        }
        return {status: 'noinput'};
      }
    }, () => resolve());
  });
}

// Show a modal with an "Extract Info" button
function showExtractButtonModal() {
  const oldModal = document.getElementById('extract-modal');
  if (oldModal) oldModal.remove();

  const modal = document.createElement('div');
  modal.id = 'extract-modal';
  modal.style.position = 'fixed';
  modal.style.top = '50%';
  modal.style.left = '50%';
  modal.style.transform = 'translate(-50%, -50%)';
  modal.style.background = '#334155';
  modal.style.color = '#fff';
  modal.style.padding = '24px 18px';
  modal.style.borderRadius = '16px';
  modal.style.boxShadow = '0 8px 32px rgba(0,0,0,0.25)';
  modal.style.zIndex = '9999';
  modal.style.textAlign = 'center';

  const title = document.createElement('div');
  title.textContent = 'Ready to Extract Info';
  title.style.fontWeight = 'bold';
  title.style.marginBottom = '12px';
  modal.appendChild(title);

  const info = document.createElement('div');
  info.textContent = 'Once the page has loaded, click below to extract work package info.';
  info.style.marginBottom = '18px';
  modal.appendChild(info);

  const extractBtn = document.createElement('button');
  extractBtn.textContent = 'Extract Info';
  extractBtn.style.padding = '8px 18px';
  extractBtn.style.borderRadius = '8px';
  extractBtn.style.border = 'none';
  extractBtn.style.background = '#38bdf8';
  extractBtn.style.color = '#1e293b';
  extractBtn.style.fontWeight = 'bold';
  extractBtn.style.cursor = 'pointer';
  extractBtn.onclick = () => {
    modal.remove();
    extractWorkPackageInfoMultiple();
  };
  modal.appendChild(extractBtn);

  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'Close';
  closeBtn.style.marginLeft = '12px';
  closeBtn.style.padding = '8px 18px';
  closeBtn.style.borderRadius = '8px';
  closeBtn.style.border = 'none';
  closeBtn.style.background = '#64748b';
  closeBtn.style.color = '#fff';
  closeBtn.style.fontWeight = 'bold';
  closeBtn.style.cursor = 'pointer';
  closeBtn.onclick = () => modal.remove();
  modal.appendChild(closeBtn);

  document.body.appendChild(modal);
}

// Extraction logic supporting multiple rows
function extractWorkPackageInfoMultiple() {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.scripting.executeScript({
      target: {tabId: tabs[0].id},
      func: () => {
        function getValueAfterLabel(label) {
          const xpath = `//*[contains(text(), "${label}")]`;
          const results = document.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
          for (let i = 0; i < results.snapshotLength; i++) {
            const node = results.snapshotItem(i);
            let value = null;
            const match = node.textContent.match(new RegExp(label.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '\\s*:?\\s*(.+)$'));
            if (match) value = match[1].trim();
            if (!value && node.nextSibling && node.nextSibling.textContent.trim()) {
              value = node.nextSibling.textContent.trim();
            }
            if (!value && node.querySelector) {
              const bold = node.querySelector('b,span');
              if (bold) value = bold.textContent.trim();
            }
            if (value) return value;
          }
          return '';
        }
        // For now, extract one row; you can extend this to extract multiple if needed
        return [{
          'OEM Part Number': getValueAfterLabel('OEM Part Number:'),
          'OEM Serial No': getValueAfterLabel('OEM Serial No:'),
          'Owner': getValueAfterLabel('Owner:'),
          'Inventory': getValueAfterLabel('Inventory Details :')
        }];
      }
    }, (results) => {
      const rows = results[0].result;
      showMultiRowTableModal(rows);
    });
  });
}

// Main entry point for the multi-ISFN workflow (no extract/close modal)
async function scheduleWorkPackage() {
  let extractedRows = [];
  let searchPageUrl = window.location.href; // fallback if not in extension popup

  // Get the current tab's URL (the search page)
  await new Promise((resolve) => {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      searchPageUrl = tabs[0].url;
      resolve();
    });
  });

  let isFirst = true;
  while (true) {
    let isfnWord = prompt('Enter the ISFN word (starts with "ISFN"):');
    if (!isfnWord || !/^ISFN\w*/i.test(isfnWord)) {
      alert('Please enter a valid word starting with "ISFN".');
      break;
    }
    let scheduleHr = prompt('Enter Schedule hr for this ISFN:');
    if (scheduleHr === null) break;

    // For ISFN after the first, reload the search page before inserting
    if (!isFirst) {
      await new Promise((resolve) => {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
          chrome.tabs.update(tabs[0].id, {url: searchPageUrl}, () => {
            // Wait for the page to load
            let checkLoaded = setInterval(() => {
              chrome.tabs.get(tabs[0].id, (tab) => {
                if (tab.status === 'complete') {
                  clearInterval(checkLoaded);
                  setTimeout(resolve, 500); // Give a little extra time for DOM
                }
              });
            }, 300);
          });
        });
      });
    }
    isFirst = false;

    // Insert ISFN and load page
    await new Promise((resolve) => {
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.scripting.executeScript({
          target: {tabId: tabs[0].id},
          args: [isfnWord],
          func: (isfn) => {
            const input = document.getElementById('idBarcodeSearchInput');
            if (input) {
              input.value = isfn;
              input.dispatchEvent(new Event('input', { bubbles: true }));

              // Try submitting the form if input is inside a form
              if (input.form) {
                input.form.submit();
                return {status: 'inserted', isfn: isfn, method: 'form'};
              }

              // Try triggering Enter key events
              input.focus();
              const enterEvent = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Enter', code: 'Enter', keyCode: 13 });
              input.dispatchEvent(enterEvent);

              // Also try triggering 'change' event
              input.dispatchEvent(new Event('change', { bubbles: true }));

              return {status: 'inserted', isfn: isfn, method: 'event'};
            }
            return {status: 'noinput'};
          }
        }, () => resolve());
      });
    });

    // Wait for the result page to load
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Extract info
    await new Promise((resolve) => {
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.scripting.executeScript({
          target: {tabId: tabs[0].id},
          func: () => {
            function getValueAfterLabel(label) {
              const xpath = `//*[contains(text(), "${label}")]`;
              const results = document.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
              for (let i = 0; i < results.snapshotLength; i++) {
                const node = results.snapshotItem(i);
                let value = null;
                const match = node.textContent.match(new RegExp(label.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '\\s*:?\\s*(.+)$'));
                if (match) value = match[1].trim();
                if (!value && node.nextSibling && node.nextSibling.textContent.trim()) {
                  value = node.nextSibling.textContent.trim();
                }
                if (!value && node.querySelector) {
                  const bold = node.querySelector('b,span');
                  if (bold) value = bold.textContent.trim();
                }
                if (value) return value;
              }
              return '';
            }
            return {
              'OEM Part Number': getValueAfterLabel('OEM Part Number:'),
              'OEM Serial No': getValueAfterLabel('OEM Serial No:'),
              'Owner': getValueAfterLabel('Owner:'),
              'Schedule hr': '' // Will be filled in below
            };
          }
        }, (results) => {
          const data = results[0].result;
          data['Schedule hr'] = scheduleHr;
          extractedRows.push(data);
          resolve();
        });
      });
    });

    let more = confirm('Do you want to add another ISFN?');
    if (!more) break;
  }

  // Show the final table
  if (extractedRows.length > 0) {
    showMultiRowTableModal(extractedRows);
  }
}

// Modal for multiple rows, allows editing Schedule hr and copying table
function showMultiRowTableModal(rows) {
  const oldModal = document.getElementById('wp-modal');
  if (oldModal) oldModal.remove();

  const modal = document.createElement('div');
  modal.id = 'wp-modal';
  modal.style.position = 'fixed';
  modal.style.top = '50%';
  modal.style.left = '50%';
  modal.style.transform = 'translate(-50%, -50%)';
  modal.style.background = '#334155';
  modal.style.color = '#fff';
  modal.style.padding = '24px 18px';
  modal.style.borderRadius = '16px';
  modal.style.boxShadow = '0 8px 32px rgba(0,0,0,0.25)';
  modal.style.zIndex = '9999';
  modal.style.textAlign = 'center';
  modal.style.maxHeight = '80vh';
  modal.style.overflowY = 'auto';

  const title = document.createElement('div');
  title.textContent = 'Work Package Info';
  title.style.fontWeight = 'bold';
  title.style.marginBottom = '12px';
  modal.appendChild(title);

  // Table
  const table = document.createElement('table');
  table.style.margin = '0 auto 12px auto';
  table.style.borderCollapse = 'collapse';
  table.style.background = '#fff';
  table.style.color = '#222';

  // Header row
  const headerRow = document.createElement('tr');
  ['Item', 'Description', 'OEM Part Number', 'OEM Serial No', 'Owner', 'Schedule hr'].forEach(header => {
    const th = document.createElement('th');
    th.textContent = header;
    th.style.padding = '4px 8px';
    th.style.background = '#38bdf8';
    th.style.color = '#1e293b';
    th.style.fontWeight = 'bold';
    headerRow.appendChild(th);
  });
  table.appendChild(headerRow);

  // Data rows
  rows.forEach((row, idx) => {
    const dataRow = document.createElement('tr');
    // Item
    const tdItem = document.createElement('td');
    tdItem.textContent = idx + 1;
    dataRow.appendChild(tdItem);
    // Description
    const tdDesc = document.createElement('td');
    tdDesc.textContent = row['Inventory Details '] || '';
    dataRow.appendChild(tdDesc);
    // OEM Part Number
    const tdPart = document.createElement('td');
    tdPart.textContent = row['OEM Part Number'] || '';
    dataRow.appendChild(tdPart);
    // OEM Serial No
    const tdSerial = document.createElement('td');
    tdSerial.textContent = row['OEM Serial No'] || '';
    dataRow.appendChild(tdSerial);
    // Owner
    const tdOwner = document.createElement('td');
    tdOwner.textContent = row['Owner'] || '';
    dataRow.appendChild(tdOwner);
    // Schedule hr (editable)
    const tdSchedule = document.createElement('td');
    const input = document.createElement('input');
    input.type = 'text';
    input.value = row['Schedule hr'] || '';
    input.style.width = '60px';
    input.oninput = (e) => {
      row['Schedule hr'] = e.target.value;
    };
    tdSchedule.appendChild(input);
    dataRow.appendChild(tdSchedule);
    table.appendChild(dataRow);
  });

  modal.appendChild(table);

  // Copy Table button
  const copyBtn = document.createElement('button');
  copyBtn.textContent = 'Copy Table';
  copyBtn.style.padding = '8px 18px';
  copyBtn.style.borderRadius = '8px';
  copyBtn.style.border = 'none';
  copyBtn.style.background = '#38bdf8';
  copyBtn.style.color = '#1e293b';
  copyBtn.style.fontWeight = 'bold';
  copyBtn.style.cursor = 'pointer';
  copyBtn.style.marginRight = '12px';
  copyBtn.onclick = () => {
    let text = 'Item\tDescription\tOEM Part Number\tOEM Serial No\tOwner\tSchedule hr\n';
    rows.forEach((row, idx) => {
      text += `${idx + 1}\t\t${row['OEM Part Number'] || ''}\t${row['OEM Serial No'] || ''}\t${row['Owner'] || ''}\t${row['Schedule hr'] || ''}\n`;
    });
    navigator.clipboard.writeText(text);
    copyBtn.textContent = 'Copied!';
    setTimeout(() => { copyBtn.textContent = 'Copy Table'; }, 1200);
  };
  modal.appendChild(copyBtn);

  // Cancel/Close button
  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'Cancel';
  closeBtn.style.padding = '8px 18px';
  closeBtn.style.borderRadius = '8px';
  closeBtn.style.border = 'none';
  closeBtn.style.background = '#64748b';
  closeBtn.style.color = '#fff';
  closeBtn.style.fontWeight = 'bold';
  closeBtn.style.cursor = 'pointer';
  closeBtn.onclick = () => modal.remove();
  modal.appendChild(closeBtn);

  document.body.appendChild(modal);
}

function extractWorkPackageInfo() {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.scripting.executeScript({
      target: {tabId: tabs[0].id},
      func: () => {
        function getValueAfterLabel(label) {
          const xpath = `//*[contains(text(), "${label}")]`;
          const results = document.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
          for (let i = 0; i < results.snapshotLength; i++) {
            const node = results.snapshotItem(i);
            let value = null;
            const match = node.textContent.match(new RegExp(label.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '\\s*:?\\s*(.+)$'));
            if (match) value = match[1].trim();
            if (!value && node.nextSibling && node.nextSibling.textContent.trim()) {
              value = node.nextSibling.textContent.trim();
            }
            if (!value && node.querySelector) {
              const bold = node.querySelector('b,span');
              if (bold) value = bold.textContent.trim();
            }
            if (value) return value;
          }
          return '';
        }
        return {
          'OEM Part Number': getValueAfterLabel('OEM Part Number:'),
          'OEM Serial No': getValueAfterLabel('OEM Serial No:'),
          'Owner': getValueAfterLabel('Owner:'),
          'Inventory': getValueAfterLabel('Inventory:')
        };
      }
    }, (results) => {
      const data = results[0].result;
      // Prompt for Schedule hr
      const scheduleHr = prompt('Enter Schedule hr:');
      showInfoTableModal(data, scheduleHr);
    });
  });
}

// Update showInfoTableModal to include table headers as in your Excel screenshot
function showInfoTableModal(data, scheduleHr) {
  const oldModal = document.getElementById('wp-modal');
  if (oldModal) oldModal.remove();

  const modal = document.createElement('div');
  modal.id = 'wp-modal';
  modal.style.position = 'fixed';
  modal.style.top = '50%';
  modal.style.left = '50%';
  modal.style.transform = 'translate(-50%, -50%)';
  modal.style.background = '#334155';
  modal.style.color = '#fff';
  modal.style.padding = '24px 18px';
  modal.style.borderRadius = '16px';
  modal.style.boxShadow = '0 8px 32px rgba(0,0,0,0.25)';
  modal.style.zIndex = '9999';
  modal.style.textAlign = 'center';

  const title = document.createElement('div');
  title.textContent = 'Work Package Info';
  title.style.fontWeight = 'bold';
  title.style.marginBottom = '12px';
  modal.appendChild(title);

  // Build table with headers as in your screenshot
  const table = document.createElement('table');
  table.style.margin = '0 auto 12px auto';
  table.style.borderCollapse = 'collapse';
  table.style.background = '#fff';
  table.style.color = '#222';

  // Header row
  const headerRow = document.createElement('tr');
  ['Item', 'Description', 'OEM Part Number', 'OEM Serial No', 'Owner', 'Schedule hr'].forEach(header => {
    const th = document.createElement('th');
    th.textContent = header;
    th.style.padding = '4px 8px';
    th.style.background = '#38bdf8';
    th.style.color = '#1e293b';
    th.style.fontWeight = 'bold';
    headerRow.appendChild(th);
  });
  table.appendChild(headerRow);

  // Data row (Item=1, Description blank)
  const dataRow = document.createElement('tr');
  const tdItem = document.createElement('td');
  tdItem.textContent = '1';
  dataRow.appendChild(tdItem);

  const tdDesc = document.createElement('td');
  tdDesc.textContent = '';
  dataRow.appendChild(tdDesc);

  const tdPart = document.createElement('td');
  tdPart.textContent = data['OEM Part Number'] || '';
  dataRow.appendChild(tdPart);

  const tdSerial = document.createElement('td');
  tdSerial.textContent = data['OEM Serial No'] || '';
  dataRow.appendChild(tdSerial);

  const tdOwner = document.createElement('td');
  tdOwner.textContent = data['Owner'] || '';
  dataRow.appendChild(tdOwner);

  const tdSchedule = document.createElement('td');
  tdSchedule.textContent = scheduleHr || '';
  dataRow.appendChild(tdSchedule);

  table.appendChild(dataRow);
  modal.appendChild(table);

  // Copy button
  const copyBtn = document.createElement('button');
  copyBtn.textContent = 'Copy Table';
  copyBtn.style.padding = '8px 18px';
  copyBtn.style.borderRadius = '8px';
  copyBtn.style.border = 'none';
  copyBtn.style.background = '#38bdf8';
  copyBtn.style.color = '#1e293b';
  copyBtn.style.fontWeight = 'bold';
  copyBtn.style.cursor = 'pointer';
  copyBtn.onclick = () => {
    // Copy as tab-separated text for Excel
    let text = 'Item\tDescription\tOEM Part Number\tOEM Serial No\tOwner\tSchedule hr\n';
    text += `1\t\t${data['OEM Part Number'] || ''}\t${data['OEM Serial No'] || ''}\t${data['Owner'] || ''}\t${scheduleHr || ''}\n`;
    navigator.clipboard.writeText(text);
    copyBtn.textContent = 'Copied!';
    setTimeout(() => { copyBtn.textContent = 'Copy Table'; }, 1200);
  };
  modal.appendChild(copyBtn);

  // Close button
  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'Close';
  closeBtn.style.marginLeft = '12px';
  closeBtn.style.padding = '8px 18px';
  closeBtn.style.borderRadius = '8px';
  closeBtn.style.border = 'none';
  closeBtn.style.background = '#64748b';
  closeBtn.style.color = '#fff';
  closeBtn.style.fontWeight = 'bold';
  closeBtn.style.cursor = 'pointer';
  closeBtn.onclick = () => modal.remove();
  modal.appendChild(closeBtn);

  document.body.appendChild(modal);
}
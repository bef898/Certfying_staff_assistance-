let scheduleStep = 1;

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('autoFillCard').addEventListener('click', () => {
    window.location.href = '../complete task/popup.html';
  });
  document.getElementById('scheduleCard').addEventListener('click', () => {
    if (scheduleStep === 1) {
      scheduleWorkPackage();
      scheduleStep = 2;
    } else {
      extractWorkPackageInfo();
      scheduleStep = 1;
    }
  });
  document.getElementById('close628Card').addEventListener('click', () => {
    alert('Coming soon!');
  });
  document.getElementById('ridCollectorCard').addEventListener('click', () => {
    collectRSVWords();
  });
});
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('autoFillCard').addEventListener('click', () => {
    window.location.href = '../complete task/popup.html';
  });
  document.getElementById('scheduleCard').addEventListener('click', () => {
    alert('Coming soon!');
  });
  document.getElementById('close628Card').addEventListener('click', () => {
    alert('Coming soon!');
  });
  document.getElementById('ridCollectorCard').addEventListener('click', () => {
    collectRSVWords();
  });
});
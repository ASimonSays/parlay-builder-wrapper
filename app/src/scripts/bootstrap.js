(() => {
  'use strict';
  const start = () => {
    const controller = new window.DashboardController({
      storage: window.ParlayStorage,
      root: document.getElementById('ticketList'),
      status: document.getElementById('dashboardStatus')
    });
    controller.start();
    window.parlayDashboard = controller;
  };
  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', start, { once: true })
    : start();
})();

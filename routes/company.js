const express = require('express');
const router = express.Router();
const Worker = require('../models/worker');

function getDistance(lat1, lon1, lat2, lon2) {
  const toRad = (val) => (val * Math.PI) / 180;
  const R = 6371; // km radius of Earth
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}


function sortWorkersByDistance(workers, refLat, refLon) {
  return workers.sort((a, b) => {
    const distA = getDistance(refLat, refLon, a.latitude, a.longitude);
    const distB = getDistance(refLat, refLon, b.latitude, b.longitude);
    return distA - distB;
  });
}

router.get('/company/dashboard', async (req, res) => {
  try {

    const workers = await Worker.find();

    const groupedWorkers = {};

    workers.forEach(worker => {
      if (!groupedWorkers[worker.job]) {
        groupedWorkers[worker.job] = [];
      }
      groupedWorkers[worker.job].push(worker);
    });

    const companyLat = 28.6139;
    const companyLon = 77.209;

    for (const job in groupedWorkers) {
      groupedWorkers[job] = sortWorkersByDistance(groupedWorkers[job], companyLat, companyLon);
    }

    res.render('company_dashboard', { groupedWorkers });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

module.exports = router;

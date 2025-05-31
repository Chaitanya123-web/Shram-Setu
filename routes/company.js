const express = require('express');
const router = express.Router();
const UserPost = require('../models/post');      
const Worker = require('../models/worker');      

function getDistance(lat1, lon1, lat2, lon2) {
  const toRad = (v) => (v * Math.PI) / 180;
  const R = 6371; 
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

router.get('/company/dashboard', async (req, res) => {
  try {
    const posts = await UserPost.find().lean(); 

 
    const postsWithWorkers = await Promise.all(posts.map(async post => {

      let workers = await Worker.find({ job: post.workerCategory }).lean();

      workers.sort((a, b) => {
        const distA = getDistance(post.latitude, post.longitude, a.latitude, a.longitude);
        const distB = getDistance(post.latitude, post.longitude, b.latitude, b.longitude);
        return distA - distB;
      });

      return {
        ...post,
        workers
      };
    }));

    res.render('company_dashboard', { posts: postsWithWorkers });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

module.exports = router;

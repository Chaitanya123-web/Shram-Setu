const express = require('express');
const fetch = require('node-fetch');
const FormData = require('form-data');
require('dotenv').config();

const router = express.Router();

router.post('/send-email', async (req, res) => {
  try {
    console.log("Payload received:", req.body);
    console.log("Formspree endpoint:", process.env.FORMSPREE_ENDPOINT);

    const formData = new FormData();
    for (const key in req.body) {
      formData.append(key, req.body[key]);
    }

const response = await fetch(process.env.FORMSPREE_ENDPOINT, {
  method: 'POST',
  body: formData,
  headers: { Accept: 'application/json' }
});

    console.log("Formspree status:", response.status);
    const result = await response.json();
    console.log("Formspree result:", result);

    if (response.ok) {
      res.status(200).json({ message: 'Success' });
    } else {
res.status(500).json({ message: 'Formspree error', status: response.status, details: result });
    }
  } catch (err) {
    console.error("Error in send-email:", err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
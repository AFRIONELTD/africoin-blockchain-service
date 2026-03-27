const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Initialize services at startup to log configured key addresses
require('./services/africoinService');
require('./services/TronAfricoinService');

const africoinRoutes = require('./routes/africoin');
app.use('/api/africoin', africoinRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Africoin service listening on port ${PORT}`);
}); 
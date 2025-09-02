const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const JWT_SECRET = process.env.JWT_SECRET || 'your-very-secure-secret';

// You can customize the payload as needed
const payload = {
  user: 'admin'
};

const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });

console.log('Your JWT token (valid for 1 day):');
console.log(token); 
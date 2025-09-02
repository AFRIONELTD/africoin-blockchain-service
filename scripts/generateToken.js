const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../src/middleware/auth');

// You can customize the payload as needed
const payload = {
  user: 'admin'
};

const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });

console.log('Your JWT token (valid for 1 day):');
console.log(token); 
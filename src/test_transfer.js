const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const JWT_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjoiYWRtaW4iLCJpYXQiOjE3NzQ2NDUyMTEsImV4cCI6MTc3NDczMTYxMX0.sefAjZFrbNoReDkrhSmzlY0LKmq702OHOWclLi_AcDI";
const PK = process.env.MY_PK; // Use MY_PK from .env

async function test() {
    try {
        const response = await axios.post('http://localhost:3000/api/africoin/transfer', {
            privateKey: PK,
            amount: 0.5,
            blockchain: "AFRi_ERC20",
            to: "0xBb8462A4d71341D61758322764290d2322a34117"
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${JWT_TOKEN}`
            }
        });
        console.log('SUCCESS:', JSON.stringify(response.data, null, 2));
    } catch (err) {
        console.error('ERROR:', err.response?.data || err.message);
    }
}

test();

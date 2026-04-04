const tronWebModule = require('tronweb');
let TronWeb;
if (typeof tronWebModule === 'function') {
  TronWeb = tronWebModule;
} else if (tronWebModule.TronWeb && typeof tronWebModule.TronWeb === 'function') {
  TronWeb = tronWebModule.TronWeb;
} else if (tronWebModule.default && typeof tronWebModule.default === 'function') {
  TronWeb = tronWebModule.default;
} else if (tronWebModule.default && tronWebModule.default.TronWeb) {
  TronWeb = tronWebModule.default.TronWeb;
}

require('dotenv').config();

const tronWeb = new TronWeb({
  fullHost: process.env.TRON_RPC_URL || 'https://api.shasta.trongrid.io',
});
tronWeb.defaultAddress = {
  base58: 'T9yD9hzV2A8mMPuX58K6qG2H76pD1yA68v',
  hex: '410000000000000000000000000000000000000000'
};

const contractAddr = process.env.CONTRACT_ADDRESS_TRON || 'TN1XkkZ6TVWGUppHxRRuRy5qFeW1YFWbLV';

async function debug() {
  try {
    console.log('Contract Address:', contractAddr);
    console.log('Fetching Transfer events...');
    let events = await tronWeb.getEventResult(contractAddr, { eventName: 'Transfer', size: 50 });
    
    // Normalize events
    if (events && !Array.isArray(events) && events.data) events = events.data;
    
    console.log('Found', events ? events.length : 0, 'Transfer events');
    
    if (events && events.length > 0) {
      console.log('Sample Transfer event:', JSON.stringify(events[0], null, 2));
      
      const TRON_ZERO = 'T9yD9hzV2A8mMPuX58K6qG2H76pD1yA68v';
      const TRON_ZERO_HEX = '410000000000000000000000000000000000000000';
      
      let minted = 0n;
      let burned = 0n;
      
      for (const e of events) {
        const res = e.result || e;
        const from = res.from || res.fromAddress;
        const to = res.to || res.toAddress;
        const value = res.value || res.amount;
        
        if (from === TRON_ZERO || from === TRON_ZERO_HEX || from === '0x0000000000000000000000000000000000000000') {
          minted += BigInt(value || 0);
        }
        if (to === TRON_ZERO || to === TRON_ZERO_HEX || to === '0x0000000000000000000000000000000000000000') {
          burned += BigInt(burned || 0);
        }
      }
      
      console.log('Minted from logs (50 events):', minted.toString());
      console.log('Burned from logs (50 events):', burned.toString());
    }

    // Check totalSupply and decimals
    const abi = [
      { "name": "totalSupply", "type": "function", "outputs": [{"type": "uint256"}], "stateMutability": "view" },
      { "name": "decimals", "type": "function", "outputs": [{"type": "uint8"}], "stateMutability": "view" },
      { "name": "balanceOf", "type": "function", "inputs": [{"name": "account", "type": "address"}], "outputs": [{"type": "uint256"}], "stateMutability": "view" }
    ];
    const contract = await tronWeb.contract(abi, contractAddr);
    const totalSupply = await contract.totalSupply().call();
    const decimals = await contract.decimals().call();
    const zeroBalance = await contract.balanceOf('T9yD9hzV2A8mMPuX58K6qG2H76pD1yA68v').call();
    
    console.log('On-chain Total Supply:', totalSupply.toString());
    console.log('On-chain Decimals:', decimals.toString());
    console.log('On-chain Zero Address Balance:', zeroBalance.toString());

  } catch (err) {
    console.error('Error:', err);
  }
}

debug();

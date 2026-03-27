const { ethers } = require('ethers');
require('dotenv').config();

async function main() {
    const rpcUrl = process.env.ETHEREUM_RPC_URL;
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const contractAddress = '0x147f07dDdD5A3bcA6c21f480AD13A9E19A82c7E5';
    
    const ABI = [
        "function owner() public view returns (address)",
        "function isAdmin(address admin) public view returns (bool)"
    ];
    const contract = new ethers.Contract(contractAddress, ABI, provider);
    
    try {
        const owner = await contract.owner();
        console.log('Contract Owner:', owner);
        
        const companyWallet = '0x405744eD98540f5C22c74B62b59e643B8b7A36Ba';
        const isAdmin = await contract.isAdmin(companyWallet);
        console.log(`Is Company Wallet (${companyWallet}) Admin?`, isAdmin);
    } catch (err) {
        console.error('Error querying contract:', err.message);
    }
}

main();

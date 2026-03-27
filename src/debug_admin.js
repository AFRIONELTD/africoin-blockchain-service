const { ethers } = require('ethers');
require('dotenv').config();

async function main() {
    const rpcUrl = process.env.ETHEREUM_RPC_URL;
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const contractAddress = process.env.CONTRACT_ADDRESS_ETH;
    const privateKey = process.env.COMPANY_ETH_PRIVATE_KEY;

    console.log('--- Configuration ---');
    console.log('RPC URL:', rpcUrl);
    console.log('Contract Address:', contractAddress);
    
    if (privateKey) {
        const wallet = new ethers.Wallet(privateKey, provider);
        console.log('Company Wallet Address:', wallet.address);
        
        try {
            const ABI = [
                "function isAdmin(address admin) public view returns (bool)",
                "function owner() public view returns (address)"
            ];
            const contract = new ethers.Contract(contractAddress, ABI, provider);
            
            const owner = await contract.owner();
            console.log('Contract Owner:', owner);
            
            const isAdmin = await contract.isAdmin(wallet.address);
            console.log('Is Company Wallet Admin?', isAdmin);
        } catch (err) {
            console.error('Error querying contract:', err.message);
        }
    } else {
        console.log('Company Private Key missing');
    }
}

main();

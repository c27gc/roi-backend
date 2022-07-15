const { ethers } = require("ethers");

const Contrats = require("./56.json");

const supportChainId = 97;

const RPCS = {
    1: "http://13.59.118.124/eth",
    56: "https://bsc-dataseed.binance.org/",
    97: "https://data-seed-prebsc-1-s1.binance.org:8545/",
    4002: "https://rpc.testnet.fantom.network",
    26: "http://18.117.255.252/chain",
    417: "https://testnet-rpc.icicbchain.org",
    1337: "http://localhost:7545",
    31337: "http://localhost:8545/"
}

const providers = {
    1: new ethers.providers.JsonRpcProvider(RPCS[1]),
    4002: new ethers.providers.JsonRpcProvider(RPCS[4002]),
    26: new ethers.providers.JsonRpcProvider(RPCS[26]),
    417: new ethers.providers.JsonRpcProvider(RPCS[417]),
    56: new ethers.providers.JsonRpcProvider(RPCS[56]),
    97: new ethers.providers.JsonRpcProvider(RPCS[97])
    // 1337: new ethers.providers.JsonRpcProvider(RPCS[1337]),
    // 31337: new ethers.providers.JsonRpcProvider(RPCS[31337])
}

const ticketNFTContract = new ethers.Contract(Contrats.ticketNFT.address, Contrats.ticketNFT.abi, providers[supportChainId]);
const NFTContractABI = Contrats.ticketNFT.abi;

module.exports = {
    providers,
    ticketNFTContract,
    NFTContractABI,
    supportChainId
}
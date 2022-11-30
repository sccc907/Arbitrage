const hre = require("hardhat");
const { BigNumber, utils } = require("ethers")

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const MAX_UINT = BigNumber.from(2).pow(256).sub(1).toString()

async function deployErcTokens() {

  const Tokens = {}

  const TestA = await hre.ethers.getContractFactory("Test");
  const testA = await TestA.deploy("Arbitrage A Token", "AAA", 18);
  testA.deployed();
  Tokens["A"] = testA.address;

  const TestB = await hre.ethers.getContractFactory("Test");
  const testB = await TestB.deploy("Arbitrage B Token", "BBB", 18);
  testB.deployed();
  Tokens["B"] = testB.address;

  const TestC = await hre.ethers.getContractFactory("Test");
  const testC = await TestC.deploy("Arbitrage C Token", "CCC", 18);
  testC.deployed();
  Tokens["C"] = testC.address;

  const WETH = await hre.ethers.getContractFactory("WETH");
  const weth = await WETH.deploy();
  weth.deployed();
  Tokens["WETH"] = weth.address;

  return Tokens
}

async function deployContract() {
  await hre.run("compile");

  const [ deployer ] = await hre.ethers.getSigners();

  // 1. deploy UniSwapV2 factory
  const Factory = await hre.ethers.getContractFactory("UniswapV2Factory");
  const factory = await Factory.deploy(deployer.address);
  await factory.deployed();

  const TestA = await hre.ethers.getContractFactory("Test");
  const testA = await TestA.deploy("Arbitrage A Token", "AAA", 18);
  testA.deployed();

  const TestB = await hre.ethers.getContractFactory("Test");
  const testB = await TestB.deploy("Arbitrage B Token", "BBB", 18);
  testB.deployed();

  const TestC = await hre.ethers.getContractFactory("Test");
  const testC = await TestC.deploy("Arbitrage C Token", "CCC", 18);
  testC.deployed();

  const WETH = await hre.ethers.getContractFactory("WETH");
  const weth = await WETH.deploy();
  weth.deployed();

  // 3. deploy v2 router
  const Router = await hre.ethers.getContractFactory("UniswapV2Router02");
  const router = await Router.deploy(factory.address, weth.address);
  await router.deployed();

  // 4. deploy Arbitrage
  const Arbitrage = await hre.ethers.getContractFactory("Arbitrage");
  const arbitrage = await Arbitrage.deploy(weth.address, testA.address, testB.address, router.address);
  await arbitrage.deployed();

  return { factory, router, testA, testB, testC, weth, arbitrage }

}

async function printAccountsBalance(...accounts) {
  for (let i = 0; i < accounts.length; i++) {
    let balance = await hre.web3.eth.getBalance(accounts[i].address);
    console.log(`balance${i + 1} ${utils.formatEther(balance)}`);
  }
}

async function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

exports.deployErcTokens = deployErcTokens;
exports.printAccountsBalance = printAccountsBalance;
exports.sleep = sleep;
exports.deployContract = deployContract;
exports.MAX_UINT = MAX_UINT;

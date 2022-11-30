const hre = require("hardhat");
const fs = require("fs");
const deployed = require("../deployed.json");
const {
  soliditySha3,
  keccak256,
  sha3,
  soliditySha3Raw,
} = require("web3-utils");
const { ZERO_ADDRESS } = require("./constant.js");
const { deployErcTokens } = require("./utils.js");

async function main() {

  const curNetWork = hre.network.name;
  const deployDetail = {};
  deployDetail[curNetWork] = {};

  await hre.run("compile");
  const [ deployer ] = await hre.ethers.getSigners();

  // 1. deploy UniSwapV2 factory
  const Factory = await hre.ethers.getContractFactory("UniswapV2Factory");
  const factory = await Factory.deploy(deployer.address);
  await factory.deployed();
  deployDetail[curNetWork]["factory"] = factory.address;

  // 2. deploy erc20 and weth
  const erc20s = await deployErcTokens();
  deployDetail[curNetWork] = Object.assign({}, deployDetail[curNetWork], erc20s);

  // 3. deploy v2 router
  const Router = await hre.ethers.getContractFactory("UniswapV2Router02");
  const router = await Router.deploy(factory.address, deployDetail[curNetWork]["WETH"]);
  await router.deployed();
  deployDetail[curNetWork]["router"] = router.address;

  const saveDeployed = Object.assign({}, deployed, deployDetail);
  fs.writeFileSync("deployed.json", JSON.stringify(saveDeployed, null, 4));

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

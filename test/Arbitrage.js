const { ethers } = require("hardhat");
const { utils } = require("ethers");
const {
  deployContract,
  MAX_UINT
} = require("../scripts/utils");
const { Fetcher, Pair, TokenAmount } = require('@uniswap/v2-sdk');
const { Web3Provider } = require("@ethersproject/providers")
// Account #0: 0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266 (10000 ETH)
// Account #1: 0x70997970c51812dc3a010c7d01b50e0d17dc79c8 (10000 ETH)

describe("Arbitrage Use Contract", function () {
  it("A -> WETH -> B -> A", async function () {

    // get accounts
    let [account1, account2] = await ethers.getSigners();

    // deploy test contract
    const { factory, router, testA, testB, weth, arbitrage } = await deployContract();

    const externalProvider = hre.web3.currentProvider;
    const provider = new Web3Provider(externalProvider);
    const chainID = await hre.web3.eth.getChainId();

    // account2
    // create A <-> WETH pair
    // price 1:1
    const mintAmount = "1000"
    const amountA = "100"
    await testA.connect(account1).mint(account2.address, utils.parseEther(mintAmount))
    console.log(`account1 mint ${mintAmount} tokenA to account2`)

    const amountETH = "300"
    let overrides = { value: utils.parseEther(amountETH) }
    await weth.connect(account2).deposit(overrides)
    console.log(`account2 deposit 300ETH to get 100WETH`)

    // approve A and WETH to router
    await testA.connect(account2).approve(router.address, MAX_UINT)
    await testA.connect(account2).approve(arbitrage.address, MAX_UINT)
    await weth.connect(account2).approve(router.address, MAX_UINT)
    console.log("account approve A and WETH success")

    await router.connect(account2).addLiquidity(
      testA.address,
      weth.address,
      utils.parseEther(amountA),
      utils.parseEther(amountA),
      utils.parseEther(amountA),
      utils.parseEther(amountA),
      account2.address,
      Math.floor(new Date().getTime() / 1000) + 1000,
    )
    console.log("add A <-> WETH liquidity success")

    // create B <-> ETH pair
    // price: 2:1

    const amountB = "100"
    await testB.connect(account1).mint(account2.address, utils.parseEther(mintAmount))
    console.log(`account2 mint ${mintAmount} tokenA to account2`)

    // approve A and WETH to router
    await testB.connect(account2).approve(router.address, MAX_UINT)
    console.log("account approve A success")

    await router.connect(account2).addLiquidity(
      testB.address,
      weth.address,
      utils.parseEther(amountB),
      utils.parseEther("50"),
      utils.parseEther(amountB),
      utils.parseEther("50"),
      account2.address,
      Math.floor(new Date().getTime() / 1000) + 1000,
    )
    console.log("add B <-> WETH liquidity success")

    // create A <-> B pair
    // price: 1:1
    await router.connect(account2).addLiquidity(
      testA.address,
      testB.address,
      utils.parseEther("100"),
      utils.parseEther("100"),
      utils.parseEther("100"),
      utils.parseEther("100"),
      account2.address,
      Math.floor(new Date().getTime() / 1000) + 1000,
    )
    console.log("add A <-> B liquidity success")

    console.log("------------- initial status -------------")
    let balanceA = await testA.balanceOf(account2.address)
    console.log(`account2 has A token: ${utils.formatEther(balanceA)}`)
    let balanceB = await testB.balanceOf(account2.address)
    console.log(`account2 has B token: ${utils.formatEther(balanceB)}`)
    let balanceE = await hre.web3.eth.getBalance(account2.address);
    console.log(`account2 has ETH token: ${utils.formatEther(balanceE)}`)

    await arbitrage.connect(account2).approve(testB.address)
    await arbitrage.connect(account2).approve(testA.address)
    // A -> ETH -> B -> A
    const originToken = testA.address
    let tradeA = utils.parseEther("3")
    await arbitrage.connect(account2).swap(originToken, tradeA)

    console.log("------------- after use contract trade -------------")
    balanceA = await testA.balanceOf(account2.address)
    console.log(`account2 has A token: ${utils.formatEther(balanceA)}`)
    balanceBAfter = await testB.balanceOf(account2.address)
    console.log(`account2 has B token: ${utils.formatEther(balanceBAfter)}`)
    balanceE = await hre.web3.eth.getBalance(account2.address);
    console.log(`account2 has ETH token: ${utils.formatEther(balanceE)}`)
  });
})

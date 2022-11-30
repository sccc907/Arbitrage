const { ethers } = require("hardhat");
const { utils, BigNumber } = require("ethers");
const {
  deployContract,
  printAccountsBalance,
  MAX_UINT
} = require("../scripts/utils");
const { Fetcher, Pair, TokenAmount, Route, Trade, TradeType, Percent } = require('@uniswap/v2-sdk');
const { Web3Provider } = require("@ethersproject/providers")


// Account #0: 0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266 (10000 ETH)
// Account #1: 0x70997970c51812dc3a010c7d01b50e0d17dc79c8 (10000 ETH)

describe("Arbitrage", function () {
  it("A -> WETH -> B -> A use three txs", async function () {
    // get accounts
    let [account1, account2 ] = await ethers.getSigners();

    // deploy test contract
    const { factory, router, testA, testB, weth } = await deployContract();

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

    const A = await Fetcher.fetchTokenData(chainID, testA.address, provider)
    const B = await Fetcher.fetchTokenData(chainID, testB.address, provider)
    const WETH = await Fetcher.fetchTokenData(chainID, weth.address, provider)

    Pair.FACTORY = factory.address

    async function getPair(tokenA, tokenB) {
      let pairAddress = await factory.getPair(tokenA.address, tokenB.address)

      const pairFactory = await hre.ethers.getContractFactory("UniswapV2Pair")
      const pairContract = await pairFactory.attach(pairAddress)

      const reserves = await pairContract.getReserves()
      const [reserve0, reserve1] = reserves

      const tokens = [tokenA, tokenB]
      const [token0, token1] = tokens[0].sortsBefore(tokens[1]) ? tokens : [tokens[1], tokens[0]]

      const pair = new Pair(new TokenAmount(token0, reserve0), new TokenAmount(token1, reserve1))
      return pair
    }


    // A <-> ETH 1:1
    // B <-> ETH 2:1
    // A <-> B 1:1
    // get account2 A B ETH balance
    console.log("------------- initial status -------------")
    let balanceA = await testA.balanceOf(account2.address)
    console.log(`account2 has A token: ${utils.formatEther(balanceA)}`)
    let balanceB = await testB.balanceOf(account2.address)
    console.log(`account2 has B token: ${utils.formatEther(balanceB)}`)
    let balanceE = await hre.web3.eth.getBalance(account2.address);
    console.log(`account2 has ETH token: ${utils.formatEther(balanceE)}`)

    pairAETH = await getPair(A, WETH)
    let route = new Route([pairAETH], A)
    console.log("------------- trade 30A -> ETH -------------")
    // 30A -> nETH
    let slippageTolerance = new Percent('50', '10000')
    let tradeA = utils.parseEther("3")
    let trade = new Trade(route, new TokenAmount(A, tradeA), TradeType.EXACT_INPUT)

    let amountInMax = trade.maximumAmountIn(slippageTolerance).raw.toString()
    let amountOut = trade.outputAmount.raw.toString()
    let path = [A.address, WETH.address]
    let to = account2.address
    let deadline = Math.floor(Date.now() / 1000) + 60 * 20

    await router.connect(account2).swapTokensForExactETH(
      amountOut,
      amountInMax,
      path,
      to,
      deadline
    )

    console.log("------------- after trade A -> ETH -------------")
    balanceA = await testA.balanceOf(account2.address)
    console.log(`account2 has A token: ${utils.formatEther(balanceA)}`)
    balanceB = await testB.balanceOf(account2.address)
    console.log(`account2 has B token: ${utils.formatEther(balanceB)}`)
    let balanceEAfter = await hre.web3.eth.getBalance(account2.address);
    console.log(`account2 has ETH token: ${utils.formatEther(balanceEAfter)}`)

    // trade ETH -> B
    pairBETH = await getPair(WETH, B)
    route = new Route([pairBETH], WETH)
    let tradeB = BigNumber.from(balanceEAfter).sub(BigNumber.from(balanceE))
    trade = new Trade(route, new TokenAmount(WETH, tradeB), TradeType.EXACT_INPUT)
    let amountOutMin = trade.minimumAmountOut(slippageTolerance).raw.toString()
    path = [WETH.address, B.address]
    let value = trade.inputAmount.raw

    let override = { value: value.toString() }
    await router.connect(account2).swapExactETHForTokens(
      amountOutMin,
      path,
      to,
      deadline,
      override
    )

    console.log("------------- after trade ETH -> B -------------")
    balanceA = await testA.balanceOf(account2.address)
    console.log(`account2 has A token: ${utils.formatEther(balanceA)}`)
    balanceBAfter = await testB.balanceOf(account2.address)
    console.log(`account2 has B token: ${utils.formatEther(balanceB)}`)
    balanceE = await hre.web3.eth.getBalance(account2.address);
    console.log(`account2 has ETH token: ${utils.formatEther(balanceE)}`)

    // trade B -> A
    pairBA = await getPair(B, A)
    route = new Route([pairBA], B)
    let tradeBA = BigNumber.from(balanceBAfter).sub(BigNumber.from(balanceB))
    trade = new Trade(route, new TokenAmount(B, tradeBA), TradeType.EXACT_INPUT)
    amountOutMin = trade.minimumAmountOut(slippageTolerance).raw.toString()
    amountIn = trade.inputAmount.raw.toString()
    path = [B.address, A.address]

    await router.connect(account2).swapExactTokensForTokens(
      amountIn,
      amountOutMin,
      path,
      to,
      deadline
    )

    console.log("------------- after trade B -> A -------------")
    balanceA = await testA.balanceOf(account2.address)
    console.log(`account2 has A token: ${utils.formatEther(balanceA)}`)
    balanceBAfter = await testB.balanceOf(account2.address)
    console.log(`account2 has B token: ${utils.formatEther(balanceB)}`)
    balanceE = await hre.web3.eth.getBalance(account2.address);
    console.log(`account2 has ETH token: ${utils.formatEther(balanceE)}`)



    // console.log(route.midPrice.toSignificant(6))
    // console.log(route.midPrice.invert().toSignificant(6))
    // await printAccountsBalance(account2)

  });
})

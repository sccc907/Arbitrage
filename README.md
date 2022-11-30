# A Arbitrage in Defi example

## npx hardhat compile

compile contract file

## npx hardhat node

run a local node

## npx hardhat test --network localhost test/swap.js

* deploy A B WETH tokens

* deploy uniswap v2 

* add liquidity for A <-> WETH pair, B <-> WETH pair, A <-> B pair

* swap A -> WETH -> B -> A

## npx hardhat test --network localhost test/Arbitrage.js

* deploy A B WETH tokens
 
* deploy uniswap v2

* deploy Arbitrage contract 
 
* add liquidity for A <-> WETH pair, B <-> WETH pair, A <-> B pair

* call Arbitrage contract for swap



const { utils } = require("ethers");
const { bytecode } = require("../artifacts/contracts/UniswapV2Pair.sol/UniswapV2Pair.json")

function main() {
  const hash = utils.solidityKeccak256(['bytes'], [`${bytecode}`])
  console.log("UniswapV2Pair hash code is:", hash)
}

main()

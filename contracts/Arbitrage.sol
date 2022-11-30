pragma solidity =0.6.6;
import './interfaces/IERC20.sol';
import './interfaces/IUniswapV2Router02.sol';

contract Arbitrage {

    address public WETH;
    address public A;
    address public B;
    IUniswapV2Router02 public router;

    constructor(address _WETH, address _A, address _B, address _router) public {
        WETH = _WETH;
        A = _A;
        B = _B;
        router = IUniswapV2Router02(_router);
    }

    receive() external payable {}

    function approve(address token) external {
        IERC20(token).approve(address(router), 1000000000000000000000000000000);
    }

    function swap(address originToken, uint amount) external payable {
        IERC20(originToken).transferFrom(msg.sender, address(this), amount);
        // A -> ETH
        address[] memory path1 = new address[](2);
        path1[0] = A;
        path1[1] = WETH;
        router.swapExactTokensForETH(
            amount,
            0,
            path1,
            address(this),
            block.timestamp + 100
        );

        // ETH -> B
        address[] memory path2 = new address[](2);
        path2[0] = WETH;
        path2[1] = B;
        router.swapExactETHForTokens{value: address(this).balance}(
            0,
            path2,
            address(this),
            block.timestamp + 100
        );

        // B -> A
        address[] memory path3 = new address[](2);
        path3[0] = B;
        path3[1] = A;
        uint balanceB = IERC20(B).balanceOf(address(this));
        router.swapExactTokensForTokens(
            balanceB,
            0,
            path3,
            address(this),
            block.timestamp + 100
        );

        uint balanceA = IERC20(A).balanceOf(address(this));
        IERC20(A).transfer(msg.sender, balanceA);
    }
}

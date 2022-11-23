// SPDX-License-Identifier: GPL-2.0-or-later

pragma solidity ^0.8.9;

/* solhint-disable func-name-mixedcase */
/* solhint-disable var-name-mixedcase */

interface IConvexRewardPool {
    function withdraw(uint256 _amount, bool _claim) external returns (bool);

    function withdrawAll(bool claim) external;

    function getReward(address _account) external;

    function getReward(address _account, address _forwardTo) external;

    function convexBooster() external returns (address);

    function balanceOf(address) external view returns (uint256);
}

// SPDX-License-Identifier: GPL-2.0-or-later

pragma solidity ^0.8.9;

/* solhint-disable func-name-mixedcase */
/* solhint-disable var-name-mixedcase */

interface IBooster {
    function deposit(uint256 _pid, uint256 _amount) external returns (bool);

    function depositAll(uint256 _pid) external returns (bool);
}

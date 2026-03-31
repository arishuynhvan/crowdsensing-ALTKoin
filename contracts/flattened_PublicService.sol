// Sources flattened with hardhat v2.28.6 https://hardhat.org

// SPDX-License-Identifier: MIT

// File @openzeppelin/contracts/access/IAccessControl.sol@v5.6.1

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.4.0) (access/IAccessControl.sol)

pragma solidity >=0.8.4;

/**
 * @dev External interface of AccessControl declared to support ERC-165 detection.
 */
interface IAccessControl {
    /**
     * @dev The `account` is missing a role.
     */
    error AccessControlUnauthorizedAccount(address account, bytes32 neededRole);

    /**
     * @dev The caller of a function is not the expected one.
     *
     * NOTE: Don't confuse with {AccessControlUnauthorizedAccount}.
     */
    error AccessControlBadConfirmation();

    /**
     * @dev Emitted when `newAdminRole` is set as ``role``'s admin role, replacing `previousAdminRole`
     *
     * `DEFAULT_ADMIN_ROLE` is the starting admin for all roles, despite
     * {RoleAdminChanged} not being emitted to signal this.
     */
    event RoleAdminChanged(bytes32 indexed role, bytes32 indexed previousAdminRole, bytes32 indexed newAdminRole);

    /**
     * @dev Emitted when `account` is granted `role`.
     *
     * `sender` is the account that originated the contract call. This account bears the admin role (for the granted role).
     * Expected in cases where the role was granted using the internal {AccessControl-_grantRole}.
     */
    event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender);

    /**
     * @dev Emitted when `account` is revoked `role`.
     *
     * `sender` is the account that originated the contract call:
     *   - if using `revokeRole`, it is the admin role bearer
     *   - if using `renounceRole`, it is the role bearer (i.e. `account`)
     */
    event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender);

    /**
     * @dev Returns `true` if `account` has been granted `role`.
     */
    function hasRole(bytes32 role, address account) external view returns (bool);

    /**
     * @dev Returns the admin role that controls `role`. See {grantRole} and
     * {revokeRole}.
     *
     * To change a role's admin, use {AccessControl-_setRoleAdmin}.
     */
    function getRoleAdmin(bytes32 role) external view returns (bytes32);

    /**
     * @dev Grants `role` to `account`.
     *
     * If `account` had not been already granted `role`, emits a {RoleGranted}
     * event.
     *
     * Requirements:
     *
     * - the caller must have ``role``'s admin role.
     */
    function grantRole(bytes32 role, address account) external;

    /**
     * @dev Revokes `role` from `account`.
     *
     * If `account` had been granted `role`, emits a {RoleRevoked} event.
     *
     * Requirements:
     *
     * - the caller must have ``role``'s admin role.
     */
    function revokeRole(bytes32 role, address account) external;

    /**
     * @dev Revokes `role` from the calling account.
     *
     * Roles are often managed via {grantRole} and {revokeRole}: this function's
     * purpose is to provide a mechanism for accounts to lose their privileges
     * if they are compromised (such as when a trusted device is misplaced).
     *
     * If the calling account had been granted `role`, emits a {RoleRevoked}
     * event.
     *
     * Requirements:
     *
     * - the caller must be `callerConfirmation`.
     */
    function renounceRole(bytes32 role, address callerConfirmation) external;
}


// File @openzeppelin/contracts/utils/Context.sol@v5.6.1

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.0.1) (utils/Context.sol)

pragma solidity ^0.8.20;

/**
 * @dev Provides information about the current execution context, including the
 * sender of the transaction and its data. While these are generally available
 * via msg.sender and msg.data, they should not be accessed in such a direct
 * manner, since when dealing with meta-transactions the account sending and
 * paying for execution may not be the actual sender (as far as an application
 * is concerned).
 *
 * This contract is only required for intermediate, library-like contracts.
 */
abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }

    function _msgData() internal view virtual returns (bytes calldata) {
        return msg.data;
    }

    function _contextSuffixLength() internal view virtual returns (uint256) {
        return 0;
    }
}


// File @openzeppelin/contracts/utils/introspection/IERC165.sol@v5.6.1

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.4.0) (utils/introspection/IERC165.sol)

pragma solidity >=0.4.16;

/**
 * @dev Interface of the ERC-165 standard, as defined in the
 * https://eips.ethereum.org/EIPS/eip-165[ERC].
 *
 * Implementers can declare support of contract interfaces, which can then be
 * queried by others ({ERC165Checker}).
 *
 * For an implementation, see {ERC165}.
 */
interface IERC165 {
    /**
     * @dev Returns true if this contract implements the interface defined by
     * `interfaceId`. See the corresponding
     * https://eips.ethereum.org/EIPS/eip-165#how-interfaces-are-identified[ERC section]
     * to learn more about how these ids are created.
     *
     * This function call must use less than 30 000 gas.
     */
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}


// File @openzeppelin/contracts/utils/introspection/ERC165.sol@v5.6.1

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.4.0) (utils/introspection/ERC165.sol)

pragma solidity ^0.8.20;

/**
 * @dev Implementation of the {IERC165} interface.
 *
 * Contracts that want to implement ERC-165 should inherit from this contract and override {supportsInterface} to check
 * for the additional interface id that will be supported. For example:
 *
 * ```solidity
 * function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
 *     return interfaceId == type(MyInterface).interfaceId || super.supportsInterface(interfaceId);
 * }
 * ```
 */
abstract contract ERC165 is IERC165 {
    /// @inheritdoc IERC165
    function supportsInterface(bytes4 interfaceId) public view virtual returns (bool) {
        return interfaceId == type(IERC165).interfaceId;
    }
}


// File @openzeppelin/contracts/access/AccessControl.sol@v5.6.1

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.6.0) (access/AccessControl.sol)

pragma solidity ^0.8.20;



/**
 * @dev Contract module that allows children to implement role-based access
 * control mechanisms. This is a lightweight version that doesn't allow enumerating role
 * members except through off-chain means by accessing the contract event logs. Some
 * applications may benefit from on-chain enumerability, for those cases see
 * {AccessControlEnumerable}.
 *
 * Roles are referred to by their `bytes32` identifier. These should be exposed
 * in the external API and be unique. The best way to achieve this is by
 * using `public constant` hash digests:
 *
 * ```solidity
 * bytes32 public constant MY_ROLE = keccak256("MY_ROLE");
 * ```
 *
 * Roles can be used to represent a set of permissions. To restrict access to a
 * function call, use {hasRole}:
 *
 * ```solidity
 * function foo() public {
 *     require(hasRole(MY_ROLE, msg.sender));
 *     ...
 * }
 * ```
 *
 * Roles can be granted and revoked dynamically via the {grantRole} and
 * {revokeRole} functions. Each role has an associated admin role, and only
 * accounts that have a role's admin role can call {grantRole} and {revokeRole}.
 *
 * By default, the admin role for all roles is `DEFAULT_ADMIN_ROLE`, which means
 * that only accounts with this role will be able to grant or revoke other
 * roles. More complex role relationships can be created by using
 * {_setRoleAdmin}.
 *
 * WARNING: The `DEFAULT_ADMIN_ROLE` is also its own admin: it has permission to
 * grant and revoke this role. Extra precautions should be taken to secure
 * accounts that have been granted it. We recommend using {AccessControlDefaultAdminRules}
 * to enforce additional security measures for this role.
 */
abstract contract AccessControl is Context, IAccessControl, ERC165 {
    struct RoleData {
        mapping(address account => bool) hasRole;
        bytes32 adminRole;
    }

    mapping(bytes32 role => RoleData) private _roles;

    bytes32 public constant DEFAULT_ADMIN_ROLE = 0x00;

    /**
     * @dev Modifier that checks that an account has a specific role. Reverts
     * with an {AccessControlUnauthorizedAccount} error including the required role.
     */
    modifier onlyRole(bytes32 role) {
        _checkRole(role);
        _;
    }

    /// @inheritdoc ERC165
    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return interfaceId == type(IAccessControl).interfaceId || super.supportsInterface(interfaceId);
    }

    /**
     * @dev Returns `true` if `account` has been granted `role`.
     */
    function hasRole(bytes32 role, address account) public view virtual returns (bool) {
        return _roles[role].hasRole[account];
    }

    /**
     * @dev Reverts with an {AccessControlUnauthorizedAccount} error if `_msgSender()`
     * is missing `role`. Overriding this function changes the behavior of the {onlyRole} modifier.
     */
    function _checkRole(bytes32 role) internal view virtual {
        _checkRole(role, _msgSender());
    }

    /**
     * @dev Reverts with an {AccessControlUnauthorizedAccount} error if `account`
     * is missing `role`.
     */
    function _checkRole(bytes32 role, address account) internal view virtual {
        if (!hasRole(role, account)) {
            revert AccessControlUnauthorizedAccount(account, role);
        }
    }

    /**
     * @dev Returns the admin role that controls `role`. See {grantRole} and
     * {revokeRole}.
     *
     * To change a role's admin, use {_setRoleAdmin}.
     */
    function getRoleAdmin(bytes32 role) public view virtual returns (bytes32) {
        return _roles[role].adminRole;
    }

    /**
     * @dev Grants `role` to `account`.
     *
     * If `account` had not been already granted `role`, emits a {RoleGranted}
     * event.
     *
     * Requirements:
     *
     * - the caller must have ``role``'s admin role.
     *
     * May emit a {RoleGranted} event.
     */
    function grantRole(bytes32 role, address account) public virtual onlyRole(getRoleAdmin(role)) {
        _grantRole(role, account);
    }

    /**
     * @dev Revokes `role` from `account`.
     *
     * If `account` had been granted `role`, emits a {RoleRevoked} event.
     *
     * Requirements:
     *
     * - the caller must have ``role``'s admin role.
     *
     * May emit a {RoleRevoked} event.
     */
    function revokeRole(bytes32 role, address account) public virtual onlyRole(getRoleAdmin(role)) {
        _revokeRole(role, account);
    }

    /**
     * @dev Revokes `role` from the calling account.
     *
     * Roles are often managed via {grantRole} and {revokeRole}: this function's
     * purpose is to provide a mechanism for accounts to lose their privileges
     * if they are compromised (such as when a trusted device is misplaced).
     *
     * If the calling account had been revoked `role`, emits a {RoleRevoked}
     * event.
     *
     * Requirements:
     *
     * - the caller must be `callerConfirmation`.
     *
     * May emit a {RoleRevoked} event.
     */
    function renounceRole(bytes32 role, address callerConfirmation) public virtual {
        if (callerConfirmation != _msgSender()) {
            revert AccessControlBadConfirmation();
        }

        _revokeRole(role, callerConfirmation);
    }

    /**
     * @dev Sets `adminRole` as ``role``'s admin role.
     *
     * Emits a {RoleAdminChanged} event.
     */
    function _setRoleAdmin(bytes32 role, bytes32 adminRole) internal virtual {
        bytes32 previousAdminRole = getRoleAdmin(role);
        _roles[role].adminRole = adminRole;
        emit RoleAdminChanged(role, previousAdminRole, adminRole);
    }

    /**
     * @dev Attempts to grant `role` to `account` and returns a boolean indicating if `role` was granted.
     *
     * Internal function without access restriction.
     *
     * May emit a {RoleGranted} event.
     */
    function _grantRole(bytes32 role, address account) internal virtual returns (bool) {
        if (!hasRole(role, account)) {
            _roles[role].hasRole[account] = true;
            emit RoleGranted(role, account, _msgSender());
            return true;
        } else {
            return false;
        }
    }

    /**
     * @dev Attempts to revoke `role` from `account` and returns a boolean indicating if `role` was revoked.
     *
     * Internal function without access restriction.
     *
     * May emit a {RoleRevoked} event.
     */
    function _revokeRole(bytes32 role, address account) internal virtual returns (bool) {
        if (hasRole(role, account)) {
            _roles[role].hasRole[account] = false;
            emit RoleRevoked(role, account, _msgSender());
            return true;
        } else {
            return false;
        }
    }
}


// File @openzeppelin/contracts/utils/StorageSlot.sol@v5.6.1

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.1.0) (utils/StorageSlot.sol)
// This file was procedurally generated from scripts/generate/templates/StorageSlot.js.

pragma solidity ^0.8.20;

/**
 * @dev Library for reading and writing primitive types to specific storage slots.
 *
 * Storage slots are often used to avoid storage conflict when dealing with upgradeable contracts.
 * This library helps with reading and writing to such slots without the need for inline assembly.
 *
 * The functions in this library return Slot structs that contain a `value` member that can be used to read or write.
 *
 * Example usage to set ERC-1967 implementation slot:
 * ```solidity
 * contract ERC1967 {
 *     // Define the slot. Alternatively, use the SlotDerivation library to derive the slot.
 *     bytes32 internal constant _IMPLEMENTATION_SLOT = 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;
 *
 *     function _getImplementation() internal view returns (address) {
 *         return StorageSlot.getAddressSlot(_IMPLEMENTATION_SLOT).value;
 *     }
 *
 *     function _setImplementation(address newImplementation) internal {
 *         require(newImplementation.code.length > 0);
 *         StorageSlot.getAddressSlot(_IMPLEMENTATION_SLOT).value = newImplementation;
 *     }
 * }
 * ```
 *
 * TIP: Consider using this library along with {SlotDerivation}.
 */
library StorageSlot {
    struct AddressSlot {
        address value;
    }

    struct BooleanSlot {
        bool value;
    }

    struct Bytes32Slot {
        bytes32 value;
    }

    struct Uint256Slot {
        uint256 value;
    }

    struct Int256Slot {
        int256 value;
    }

    struct StringSlot {
        string value;
    }

    struct BytesSlot {
        bytes value;
    }

    /**
     * @dev Returns an `AddressSlot` with member `value` located at `slot`.
     */
    function getAddressSlot(bytes32 slot) internal pure returns (AddressSlot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns a `BooleanSlot` with member `value` located at `slot`.
     */
    function getBooleanSlot(bytes32 slot) internal pure returns (BooleanSlot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns a `Bytes32Slot` with member `value` located at `slot`.
     */
    function getBytes32Slot(bytes32 slot) internal pure returns (Bytes32Slot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns a `Uint256Slot` with member `value` located at `slot`.
     */
    function getUint256Slot(bytes32 slot) internal pure returns (Uint256Slot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns a `Int256Slot` with member `value` located at `slot`.
     */
    function getInt256Slot(bytes32 slot) internal pure returns (Int256Slot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns a `StringSlot` with member `value` located at `slot`.
     */
    function getStringSlot(bytes32 slot) internal pure returns (StringSlot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns an `StringSlot` representation of the string storage pointer `store`.
     */
    function getStringSlot(string storage store) internal pure returns (StringSlot storage r) {
        assembly ("memory-safe") {
            r.slot := store.slot
        }
    }

    /**
     * @dev Returns a `BytesSlot` with member `value` located at `slot`.
     */
    function getBytesSlot(bytes32 slot) internal pure returns (BytesSlot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns an `BytesSlot` representation of the bytes storage pointer `store`.
     */
    function getBytesSlot(bytes storage store) internal pure returns (BytesSlot storage r) {
        assembly ("memory-safe") {
            r.slot := store.slot
        }
    }
}


// File @openzeppelin/contracts/utils/ReentrancyGuard.sol@v5.6.1

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.5.0) (utils/ReentrancyGuard.sol)

pragma solidity ^0.8.20;

/**
 * @dev Contract module that helps prevent reentrant calls to a function.
 *
 * Inheriting from `ReentrancyGuard` will make the {nonReentrant} modifier
 * available, which can be applied to functions to make sure there are no nested
 * (reentrant) calls to them.
 *
 * Note that because there is a single `nonReentrant` guard, functions marked as
 * `nonReentrant` may not call one another. This can be worked around by making
 * those functions `private`, and then adding `external` `nonReentrant` entry
 * points to them.
 *
 * TIP: If EIP-1153 (transient storage) is available on the chain you're deploying at,
 * consider using {ReentrancyGuardTransient} instead.
 *
 * TIP: If you would like to learn more about reentrancy and alternative ways
 * to protect against it, check out our blog post
 * https://blog.openzeppelin.com/reentrancy-after-istanbul/[Reentrancy After Istanbul].
 *
 * IMPORTANT: Deprecated. This storage-based reentrancy guard will be removed and replaced
 * by the {ReentrancyGuardTransient} variant in v6.0.
 *
 * @custom:stateless
 */
abstract contract ReentrancyGuard {
    using StorageSlot for bytes32;

    // keccak256(abi.encode(uint256(keccak256("openzeppelin.storage.ReentrancyGuard")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 private constant REENTRANCY_GUARD_STORAGE =
        0x9b779b17422d0df92223018b32b4d1fa46e071723d6817e2486d003becc55f00;

    // Booleans are more expensive than uint256 or any type that takes up a full
    // word because each write operation emits an extra SLOAD to first read the
    // slot's contents, replace the bits taken up by the boolean, and then write
    // back. This is the compiler's defense against contract upgrades and
    // pointer aliasing, and it cannot be disabled.

    // The values being non-zero value makes deployment a bit more expensive,
    // but in exchange the refund on every call to nonReentrant will be lower in
    // amount. Since refunds are capped to a percentage of the total
    // transaction's gas, it is best to keep them low in cases like this one, to
    // increase the likelihood of the full refund coming into effect.
    uint256 private constant NOT_ENTERED = 1;
    uint256 private constant ENTERED = 2;

    /**
     * @dev Unauthorized reentrant call.
     */
    error ReentrancyGuardReentrantCall();

    constructor() {
        _reentrancyGuardStorageSlot().getUint256Slot().value = NOT_ENTERED;
    }

    /**
     * @dev Prevents a contract from calling itself, directly or indirectly.
     * Calling a `nonReentrant` function from another `nonReentrant`
     * function is not supported. It is possible to prevent this from happening
     * by making the `nonReentrant` function external, and making it call a
     * `private` function that does the actual work.
     */
    modifier nonReentrant() {
        _nonReentrantBefore();
        _;
        _nonReentrantAfter();
    }

    /**
     * @dev A `view` only version of {nonReentrant}. Use to block view functions
     * from being called, preventing reading from inconsistent contract state.
     *
     * CAUTION: This is a "view" modifier and does not change the reentrancy
     * status. Use it only on view functions. For payable or non-payable functions,
     * use the standard {nonReentrant} modifier instead.
     */
    modifier nonReentrantView() {
        _nonReentrantBeforeView();
        _;
    }

    function _nonReentrantBeforeView() private view {
        if (_reentrancyGuardEntered()) {
            revert ReentrancyGuardReentrantCall();
        }
    }

    function _nonReentrantBefore() private {
        // On the first call to nonReentrant, _status will be NOT_ENTERED
        _nonReentrantBeforeView();

        // Any calls to nonReentrant after this point will fail
        _reentrancyGuardStorageSlot().getUint256Slot().value = ENTERED;
    }

    function _nonReentrantAfter() private {
        // By storing the original value once again, a refund is triggered (see
        // https://eips.ethereum.org/EIPS/eip-2200)
        _reentrancyGuardStorageSlot().getUint256Slot().value = NOT_ENTERED;
    }

    /**
     * @dev Returns true if the reentrancy guard is currently set to "entered", which indicates there is a
     * `nonReentrant` function in the call stack.
     */
    function _reentrancyGuardEntered() internal view returns (bool) {
        return _reentrancyGuardStorageSlot().getUint256Slot().value == ENTERED;
    }

    function _reentrancyGuardStorageSlot() internal pure virtual returns (bytes32) {
        return REENTRANCY_GUARD_STORAGE;
    }
}


// File contracts/PublicService.sol

// Original license: SPDX_License_Identifier: MIT
pragma solidity ^0.8.20;


contract PublicService is AccessControl, ReentrancyGuard {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    uint256 public STAKE_AMOUNT;
    uint256 public REPORT_FEE;
    uint256 public REWARD_AMOUNT;
    uint256 public treasuryBalance;

    enum Status { Submitted, Approved, Rejected }

    struct Report {
        address reporter;
        string contentHash;
        string[] imageCIDs;
        string location;
        int256 score;
        Status status;
        uint256 timestamp;
    }

    mapping(address => uint256) public stakes;
    mapping(uint256 => Report) public reports;
    mapping(uint256 => uint256) public reportPools;
    uint256 public reportCount;
    mapping(address => bool) public locked;

    mapping(uint256 => mapping(address => bool)) private _hasVoted;
    mapping(uint256 => address[]) private _upVoters;
    mapping(uint256 => address[]) private _downVoters;

    event CitizenRegistered(address indexed citizen, uint256 stake);
    event ReportSubmitted(uint256 indexed reportId, address indexed reporter);
    event ReportUpdated(uint256 indexed reportId);
    event Voted(uint256 indexed reportId, address indexed voter, bool isUpVote);
    event ReportResolved(uint256 indexed reportId, bool approved, address indexed admin);
    event StakeUpdated(address indexed citizen, uint256 newStake, string reason);
    event AccountLocked(address indexed citizen);
    event AccountUnlocked(address indexed citizen);
    event TreasuryFunded(address indexed funder, uint256 amount, uint256 newTreasuryBalance);
    event ReportFeeCollected(uint256 indexed reportId, address indexed reporter, uint256 amount, uint256 reportPoolBalance);
    event PenaltyCollected(
        uint256 indexed reportId,
        address indexed citizen,
        uint256 amount,
        string reason,
        uint256 reportPoolBalance
    );
    event AdminFeePaid(uint256 indexed reportId, address indexed admin, uint256 amount);
    event ReporterRefunded(uint256 indexed reportId, address indexed reporter, uint256 amount, bool approved);
    event VoterRewardsDistributed(
        uint256 indexed reportId,
        bool approved,
        uint256 totalDistributed,
        uint256 perVoter,
        uint256 voterCount
    );
    event EconomicParamsUpdated(
        uint256 stakeAmount,
        uint256 reportFee,
        uint256 rewardAmount,
        address indexed updatedBy
    );

    error AlreadyRegistered();
    error NotRegistered();
    error InsufficientStake();
    error ReportNotFound();
    error AlreadyVoted();
    error CannotUpdateReport();
    error CitizenLockedError();
    error InvalidEconomicParams();
    error TransferFailed();

    constructor() payable {
        _grantRole(ADMIN_ROLE, msg.sender);
        _setEconomicParams(0.00002 ether, 0.000007 ether, 0.000001 ether);
        if (msg.value > 0) {
            treasuryBalance += msg.value;
            emit TreasuryFunded(msg.sender, msg.value, treasuryBalance);
        }
    }

    receive() external payable {
        treasuryBalance += msg.value;
        emit TreasuryFunded(msg.sender, msg.value, treasuryBalance);
    }

    function _setEconomicParams(uint256 stakeAmount, uint256 reportFee, uint256 rewardAmount) internal {
        if (stakeAmount == 0 || reportFee == 0 || rewardAmount == 0) revert InvalidEconomicParams();
        STAKE_AMOUNT = stakeAmount;
        REPORT_FEE = reportFee;
        REWARD_AMOUNT = rewardAmount;
        emit EconomicParamsUpdated(stakeAmount, reportFee, rewardAmount, msg.sender);
    }

    function setEconomicParams(uint256 stakeAmount, uint256 reportFee, uint256 rewardAmount) external onlyRole(ADMIN_ROLE) {
        _setEconomicParams(stakeAmount, reportFee, rewardAmount);
    }

    function setStakeAmount(uint256 stakeAmount) external onlyRole(ADMIN_ROLE) {
        _setEconomicParams(stakeAmount, REPORT_FEE, REWARD_AMOUNT);
    }

    function setReportFee(uint256 reportFee) external onlyRole(ADMIN_ROLE) {
        _setEconomicParams(STAKE_AMOUNT, reportFee, REWARD_AMOUNT);
    }

    function setRewardAmount(uint256 rewardAmount) external onlyRole(ADMIN_ROLE) {
        _setEconomicParams(STAKE_AMOUNT, REPORT_FEE, rewardAmount);
    }

    function registerCitizen() external payable {
        if (stakes[msg.sender] >= STAKE_AMOUNT && !locked[msg.sender]) revert AlreadyRegistered();
        if (msg.value != STAKE_AMOUNT) revert InsufficientStake();
        
        stakes[msg.sender] = msg.value;
        if (locked[msg.sender]) {
            locked[msg.sender] = false;
            emit AccountUnlocked(msg.sender);
        }
        emit CitizenRegistered(msg.sender, msg.value);
    }

    function submitReport(string memory contentHash, string[] memory imageCIDs, string memory location) external payable nonReentrant {
        if (locked[msg.sender]) revert CitizenLockedError();
        if (stakes[msg.sender] < STAKE_AMOUNT) revert NotRegistered();
        if (msg.value != REPORT_FEE) revert InsufficientStake();

        uint256 reportId = reportCount++;
        reports[reportId] = Report({
            reporter: msg.sender,
            contentHash: contentHash,
            imageCIDs: imageCIDs,
            location: location,
            score: 0,
            status: Status.Submitted,
            timestamp: block.timestamp
        });
        reportPools[reportId] = msg.value;
        treasuryBalance += msg.value;

        emit ReportFeeCollected(reportId, msg.sender, msg.value, reportPools[reportId]);
        emit ReportSubmitted(reportId, msg.sender);
    }

    function updateReport(uint256 reportId, string memory newContentHash, string[] memory newImageCIDs, string memory newLocation) external {
        Report storage report = reports[reportId];
        if (report.reporter == address(0)) revert ReportNotFound();
        if (report.reporter != msg.sender) revert ReportNotFound();
        if (report.status != Status.Submitted) revert CannotUpdateReport();

        report.contentHash = newContentHash;
        report.location = newLocation;
        for (uint i = 0; i < newImageCIDs.length; i++) {
            report.imageCIDs.push(newImageCIDs[i]);
        }

        emit ReportUpdated(reportId);
    }

    function vote(uint256 reportId, bool isUpVote) internal {
        if (locked[msg.sender]) revert CitizenLockedError();
        if (stakes[msg.sender] < STAKE_AMOUNT) revert NotRegistered();
        if (reports[reportId].reporter == address(0)) revert ReportNotFound();
        if (_hasVoted[reportId][msg.sender]) revert AlreadyVoted();

        _hasVoted[reportId][msg.sender] = true;
        Report storage report = reports[reportId];

        if (isUpVote) {
            report.score++;
            _upVoters[reportId].push(msg.sender);
        } else {
            report.score--;
            _downVoters[reportId].push(msg.sender);
        }
        emit Voted(reportId, msg.sender, isUpVote);
    }

    function voteUp(uint256 reportId) external { vote(reportId, true); }
    function voteDown(uint256 reportId) external { vote(reportId, false); }

    function _collectPenalty(
        uint256 reportId,
        uint256 currentPool,
        address citizen,
        uint256 amount,
        string memory reason
    ) internal returns (uint256) {
        if (stakes[citizen] < amount) return currentPool;

        stakes[citizen] -= amount;
        emit StakeUpdated(citizen, stakes[citizen], reason);

        if (stakes[citizen] < STAKE_AMOUNT) {
            locked[citizen] = true;
            emit AccountLocked(citizen);
        }

        uint256 updatedPool = currentPool + amount;
        treasuryBalance += amount;
        emit PenaltyCollected(reportId, citizen, amount, reason, updatedPool);
        return updatedPool;
    }

    function _commonTreasury(uint256 pool) internal view returns (uint256) {
        return treasuryBalance > pool ? treasuryBalance - pool : 0;
    }

    function _payFromPool(
        uint256 pool,
        uint256 amountTarget
    ) internal returns (uint256 updatedPool, uint256 paidAmount) {
        paidAmount = amountTarget <= pool ? amountTarget : pool;
        updatedPool = pool;
        if (paidAmount > 0) {
            updatedPool -= paidAmount;
            treasuryBalance -= paidAmount;
        }
    }

    function _safeSend(address to, uint256 amount) internal {
        if (amount == 0) return;
        (bool ok, ) = to.call{ value: amount }("");
        if (!ok) revert TransferFailed();
    }

    function _executeResolutionPayouts(
        uint256 reportId,
        bool approve,
        address reporter,
        address[] storage winners,
        uint256 adminPayout,
        uint256 reporterPayout,
        uint256 perVoterReward,
        uint256 totalVoterPayout
    ) internal {
        _safeSend(msg.sender, adminPayout);
        if (adminPayout > 0) emit AdminFeePaid(reportId, msg.sender, adminPayout);

        _safeSend(reporter, reporterPayout);
        emit ReporterRefunded(reportId, reporter, reporterPayout, approve);

        if (perVoterReward > 0) {
            for (uint256 i = 0; i < winners.length; i++) {
                _safeSend(winners[i], perVoterReward);
            }
        }

        emit VoterRewardsDistributed(reportId, approve, totalVoterPayout, perVoterReward, winners.length);
    }

    function adminResolve(uint256 reportId, bool approve) external onlyRole(ADMIN_ROLE) nonReentrant {
        Report storage report = reports[reportId];
        if (report.reporter == address(0)) revert ReportNotFound();
        if (report.status != Status.Submitted) revert CannotUpdateReport();
        report.status = approve ? Status.Approved : Status.Rejected;

        address[] storage winners = approve ? _upVoters[reportId] : _downVoters[reportId];
        address[] storage losers = approve ? _downVoters[reportId] : _upVoters[reportId];

        uint256 pool = reportPools[reportId];
        reportPools[reportId] = 0;
        if (pool > treasuryBalance) {
            pool = treasuryBalance;
        }

        uint256 adminPayout;
        (pool, adminPayout) = _payFromPool(pool, REWARD_AMOUNT);

        uint256 reporterPayout = 0;
        if (approve) {
            uint256 targetRefund = REPORT_FEE + REWARD_AMOUNT;
            uint256 fromCommon = 0;
            (pool, reporterPayout) = _payFromPool(pool, targetRefund);

            if (reporterPayout < targetRefund) {
                uint256 shortfall = targetRefund - reporterPayout;
                uint256 commonTreasury = _commonTreasury(pool);
                fromCommon = shortfall <= commonTreasury ? shortfall : commonTreasury;
                if (fromCommon > 0) {
                    treasuryBalance -= fromCommon;
                    reporterPayout += fromCommon;
                }
            }
        } else {
            pool = _collectPenalty(reportId, pool, report.reporter, REWARD_AMOUNT, "Rejected report penalty");
        }

        for (uint256 i = 0; i < losers.length; i++) {
            pool = _collectPenalty(
                reportId,
                pool,
                losers[i],
                REWARD_AMOUNT,
                approve ? "Incorrect down-vote penalty" : "Incorrect up-vote penalty"
            );
        }

        uint256 winnerCount = winners.length;
        uint256 distributable = pool;
        uint256 nominalTarget = winnerCount * REWARD_AMOUNT;

        if (winnerCount > 0 && distributable < nominalTarget) {
            uint256 shortfallToTarget = nominalTarget - distributable;
            uint256 commonTreasuryForTopUp = _commonTreasury(pool);
            uint256 topUp = shortfallToTarget <= commonTreasuryForTopUp ? shortfallToTarget : commonTreasuryForTopUp;
            distributable += topUp;
        }

        uint256 perVoterReward = winnerCount > 0 ? distributable / winnerCount : 0;
        uint256 totalVoterPayout = perVoterReward * winnerCount;
        if (totalVoterPayout > 0) {
            treasuryBalance -= totalVoterPayout;
        }
        _executeResolutionPayouts(
            reportId,
            approve,
            report.reporter,
            winners,
            adminPayout,
            reporterPayout,
            perVoterReward,
            totalVoterPayout
        );
        emit ReportResolved(reportId, approve, msg.sender);
    }

    function getReport(uint256 reportId) external view returns (Report memory) { return reports[reportId]; }
    function isLocked(address citizen) external view returns (bool) { return locked[citizen]; }

    function getReports() external view returns (Report[] memory) {
        Report[] memory allReports = new Report[](reportCount);
        for (uint i = 0; i < reportCount; i++) {
            allReports[i] = reports[i];
        }

        for (uint i = 1; i < reportCount; i++) {
            Report memory key = allReports[i];
            int256 keyScore = key.score;
            uint j = i;
            while (j > 0 && allReports[j-1].score < keyScore) {
                allReports[j] = allReports[j-1];
                j--;
            }
            allReports[j] = key;
        }
        return allReports;
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

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

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract PublicService is AccessControl, ReentrancyGuard {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    uint256 public STAKE_AMOUNT;
    uint256 public REPORT_FEE;
    uint256 public REWARD_AMOUNT;

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

    constructor() {
        _grantRole(ADMIN_ROLE, msg.sender);
        _setEconomicParams(0.00002 ether, 0.000007 ether, 0.000001 ether);
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

        emit ReportSubmitted(reportId, msg.sender);
    }

    function updateReport(uint256 reportId, string memory newContentHash, string[] memory newImageCIDs, string memory newLocation) external {
        Report storage report = reports[reportId];
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

    function adminResolve(uint256 reportId, bool approve) external onlyRole(ADMIN_ROLE) nonReentrant {
        Report storage report = reports[reportId];
        if (report.status != Status.Submitted) revert CannotUpdateReport();

        report.status = approve ? Status.Approved : Status.Rejected;

        address[] memory upvoters = _upVoters[reportId];
        address[] memory downvoters = _downVoters[reportId];

        if (approve) {
            stakes[report.reporter] += REPORT_FEE + REWARD_AMOUNT;
            emit StakeUpdated(report.reporter, stakes[report.reporter], "Approved report reward");
            for (uint i = 0; i < upvoters.length; i++) {
                stakes[upvoters[i]] += REWARD_AMOUNT;
                emit StakeUpdated(upvoters[i], stakes[upvoters[i]], "Correct up-vote reward");
            }
            for (uint i = 0; i < downvoters.length; i++) {
                address voter = downvoters[i];
                if (stakes[voter] >= REWARD_AMOUNT) {
                    stakes[voter] -= REWARD_AMOUNT;
                    emit StakeUpdated(voter, stakes[voter], "Incorrect down-vote penalty");
                    if (stakes[voter] < STAKE_AMOUNT) {
                        locked[voter] = true;
                        emit AccountLocked(voter);
                    }
                }
            }
        } else {
            if(stakes[report.reporter] >= (REPORT_FEE + REWARD_AMOUNT)) {
                stakes[report.reporter] -= (REPORT_FEE + REWARD_AMOUNT);
                emit StakeUpdated(report.reporter, stakes[report.reporter], "Rejected report penalty");
                if (stakes[report.reporter] < STAKE_AMOUNT) {
                    locked[report.reporter] = true;
                    emit AccountLocked(report.reporter);
                }
            }
            for (uint i = 0; i < upvoters.length; i++) {
                address voter = upvoters[i];
                if (stakes[voter] >= REWARD_AMOUNT) {
                    stakes[voter] -= REWARD_AMOUNT;
                    emit StakeUpdated(voter, stakes[voter], "Incorrect up-vote penalty");
                    if (stakes[voter] < STAKE_AMOUNT) {
                        locked[voter] = true;
                        emit AccountLocked(voter);
                    }
                }
            }
            if (downvoters.length > 0) {
                uint256 totalSpoils = upvoters.length * REWARD_AMOUNT;
                uint256 share = totalSpoils / downvoters.length;
                for (uint i = 0; i < downvoters.length; i++) {
                    stakes[downvoters[i]] += share;
                    emit StakeUpdated(downvoters[i], stakes[downvoters[i]], "Correct down-vote reward");
                }
            }
        }
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

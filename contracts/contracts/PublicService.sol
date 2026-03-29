// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract PublicService is AccessControl, ReentrancyGuard {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    uint256 public constant STAKE_AMOUNT = 1 ether;
    uint256 public constant REPORT_FEE = 0.01 ether;
    uint256 public constant REWARD_AMOUNT = 0.1 ether;

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

    // --- Voting ---
    // reportId => voter => hasVoted
    mapping(uint256 => mapping(address => bool)) private _hasVoted;
    // reportId => list of upvoters
    mapping(uint256 => address[]) private _upVoters;
    // reportId => list of downvoters
    mapping(uint256 => address[]) private _downVoters;

    // --- Events ---
    event CitizenRegistered(address indexed citizen, uint256 stake);
    event ReportSubmitted(uint256 indexed reportId, address indexed reporter);
    event ReportUpdated(uint256 indexed reportId);
    event Voted(uint256 indexed reportId, address indexed voter, bool isUpVote);
    event ReportResolved(uint256 indexed reportId, bool approved, address indexed admin);
    event StakeUpdated(address indexed citizen, uint256 newStake, string reason);


    // --- Custom Errors ---
    error AlreadyRegistered();
    error NotRegistered();
    error InsufficientStake();
    error ReportNotFound();
    error AlreadyVoted();
    error CannotUpdateReport();
    error InvalidVote();
    error PaymentFailed();

    constructor(address admin) {
        _grantRole(ADMIN_ROLE, admin);
    }

    // ==========================================
    // F1: Citizen Registration
    // ==========================================
    function registerCitizen() external payable {
        if (stakes[msg.sender] > 0) revert AlreadyRegistered();
        if (msg.value != STAKE_AMOUNT) revert InsufficientStake();
        
        stakes[msg.sender] = msg.value;
        emit CitizenRegistered(msg.sender, msg.value);
    }

    // ==========================================
    // F3: Report Submission & Updates
    // ==========================================
    function submitReport(string memory contentHash, string[] memory imageCIDs, string memory location) external payable nonReentrant {
        if (stakes[msg.sender] < STAKE_AMOUNT) revert NotRegistered();
        if (msg.value != REPORT_FEE) revert InsufficientStake();

        uint256 reportId = reportCount++;
        Report storage report = reports[reportId];
        report.reporter = msg.sender;
        report.contentHash = contentHash;
        report.imageCIDs = imageCIDs;
        report.location = location;
        report.status = Status.Submitted;
        report.timestamp = block.timestamp;

        emit ReportSubmitted(reportId, msg.sender);
    }

    function updateReport(uint256 reportId, string memory newContentHash, string[] memory newImageCIDs, string memory newLocation) external {
        Report storage report = reports[reportId];
        if (report.reporter != msg.sender) revert ReportNotFound(); // Or a more specific error
        if (report.status != Status.Submitted) revert CannotUpdateReport();

        report.contentHash = newContentHash;
        report.location = newLocation;
        for (uint i = 0; i < newImageCIDs.length; i++) {
            report.imageCIDs.push(newImageCIDs[i]);
        }

        emit ReportUpdated(reportId);
    }

    // ==========================================
    // F4: Voting
    // ==========================================
    function vote(uint256 reportId, bool isUpVote) internal {
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

    function voteUp(uint256 reportId) external {
        vote(reportId, true);
    }

    function voteDown(uint256 reportId) external {
        vote(reportId, false);
    }

    // ==========================================
    // F5: Resolution
    // ==========================================
    function adminResolve(uint256 reportId, bool approve) external onlyRole(ADMIN_ROLE) nonReentrant {
        Report storage report = reports[reportId];
        if (report.status != Status.Submitted) revert CannotUpdateReport(); // Report already resolved

        report.status = approve ? Status.Approved : Status.Rejected;

        address[] memory upvoters = _upVoters[reportId];
        address[] memory downvoters = _downVoters[reportId];

        if (approve) {
            // Reporter: refund fee + reward
            stakes[report.reporter] += REPORT_FEE + REWARD_AMOUNT;
            emit StakeUpdated(report.reporter, stakes[report.reporter], "Approved report reward");

            // Up-voters: reward
            for (uint i = 0; i < upvoters.length; i++) {
                stakes[upvoters[i]] += REWARD_AMOUNT;
                emit StakeUpdated(upvoters[i], stakes[upvoters[i]], "Correct up-vote reward");
            }
            // Down-voters: penalty
            for (uint i = 0; i < downvoters.length; i++) {
                stakes[downvoters[i]] -= REWARD_AMOUNT;
                emit StakeUpdated(downvoters[i], stakes[downvoters[i]], "Incorrect down-vote penalty");
            }
        } else { // Reject
            // Reporter: penalty
            stakes[report.reporter] -= (REPORT_FEE + REWARD_AMOUNT);
            emit StakeUpdated(report.reporter, stakes[report.reporter], "Rejected report penalty");

            // Up-voters: penalty
            for (uint i = 0; i < upvoters.length; i++) {
                stakes[upvoters[i]] -= REWARD_AMOUNT;
                emit StakeUpdated(upvoters[i], stakes[upvoters[i]], "Incorrect up-vote penalty");
            }
            // Down-voters: share the spoils
            if (downvoters.length > 0) {
                uint256 totalSpoils = upvoters.length * REWARD_AMOUNT;
                uint256 share = totalSpoils / downvoters.length;
                for (uint i = 0; i < downvoters.length; i++) {
                    stakes[downvoters[i]] += share;
                    emit StakeUpdated(downvoters[i], stakes[downvoters[i]], "Correct down-vote reward");
                }
            }
        }
        
        // Auto-lock check (simplified)
        // A real implementation might need a more robust mechanism
        if (stakes[report.reporter] <= 0) {
            // Citizen is locked, can't participate until they re-register
        }

        emit ReportResolved(reportId, approve, msg.sender);
    }

    // ==========================================
    // View Functions
    // ==========================================
    function getReport(uint256 reportId) external view returns (Report memory) {
        return reports[reportId];
    }

    function getUpVoters(uint256 reportId) external view returns (address[] memory) {
        return _upVoters[reportId];
    }
    
    function getDownVoters(uint256 reportId) external view returns (address[] memory) {
        return _downVoters[reportId];
    }
    
    function hasVoted(uint256 reportId, address voter) external view returns (bool) {
        return _hasVoted[reportId][voter];
    }

    function supportsInterface(bytes4 interfaceId) public view override(AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}

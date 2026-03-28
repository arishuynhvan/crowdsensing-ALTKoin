// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract PublicService {
    // --- KHAI BÁO CÁC BIẾN CƠ BẢN ---
    address public admin; // Ví của chính quyền
    uint256 public marginFeeX = 0.05 ether; // Phí ký quỹ x
    uint256 public submitFee = 0.005 ether; // Phí gửi báo cáo
    uint256 public rewardY = 0.01 ether; // Mức thưởng/phạt y

    // --- CẤU TRÚC DỮ LIỆU ---
    struct Citizen {
        string cccdHash;
        uint256 marginBalance; // Quỹ x
        bool isActive;
    }

    struct Report {
        uint256 id;
        string imageCID;
        address reporter;
        int256 score; // Score có thể âm nên dùng int
        string status; // "Submitted", "Approved", "Rejected"
    }

    mapping(address => Citizen) public citizens;
    mapping(uint256 => Report) public reports;
    uint256 public reportCount;

    // --- MODIFIER (Phân quyền) ---
    modifier onlyAdmin() {
        require(msg.sender == admin, "Chi co chinh quyen moi duoc phep thao tac");
        _;
    }

    modifier onlyActiveCitizen() {
        require(citizens[msg.sender].isActive, "Tai khooan chua active");
        _;
    }

    constructor() {
        admin = msg.sender; // Người deploy hợp đồng mặc định là chính quyền
    }

    // ==========================================
    // GIAI ĐOẠN 1 | Đăng ký - Định danh - Onboarding
    // ==========================================
    
    // Yêu cầu: Nộp phí ký quỹ x  và Lưu Hash + Active Tài khoản [cite: 10]
    function register(string memory _cccdHash) public payable {
        require(msg.value == marginFeeX, "Chua nop du phi ky quy x");
        // Logic lưu thông tin và bật isActive = true
    }

    // ==========================================
    // GIAI ĐOẠN 3 | Submit - Thanh toán - ONCHAIN
    // ==========================================
    
    // Yêu cầu: Nộp phí gửi báo cáo  và cập nhật trạng thái Submitted 
    function submitReport(string memory _imageCID) public payable onlyActiveCitizen {
        require(msg.value == submitFee, "Chua nop phi gui bao cao");
        // Logic tăng reportCount, tạo Report mới, lưu vết bằng chứng lên chuỗi [cite: 34]
    }

    // ==========================================
    // GIAI ĐOẠN 4 | Bình chọn - Ưu tiên - Voting ONCHAIN
    // ==========================================
    
    // Yêu cầu: Thực hiện Vote [cite: 39] (Up -> Score + 1 , Down -> Score - 1 )
    function voteReport(uint256 _reportId, bool _isUpVote) public onlyActiveCitizen {
        // Logic kiểm tra tài khoản đã vote chưa, sau đó cộng hoặc trừ score
    }

    // ==========================================
    // GIAI ĐOẠN 5 | Thẩm định - Trả thưởng phạt
    // ==========================================
    
    // Yêu cầu: Chính quyền thẩm định sự việc 
    function resolveReport(uint256 _reportId, bool _isApproved) public onlyAdmin {
        if (_isApproved) {
            // Báo cáo ĐÚNG: Nhận lại x + phí gửi + y 
            // Người Vote Up: Nhận thưởng y 
            // Người Vote Down: Phạt trừ y từ quỹ x 
        } else {
            // Báo cáo SAI: Mất phí gửi + Phạt trừ y từ x [cite: 55]
            // ... các logic phạt khác [cite: 56, 57]
        }
        
        // Kiểm tra Quỹ ký quỹ x 
        // Nếu x <= 0 -> Khóa tài khoản 
    }
}
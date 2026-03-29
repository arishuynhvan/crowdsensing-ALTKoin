# SRS - PUBLIC SERVICE REPORTING DAPP
Các đối tượng hệ thống (Actors)
Người dân (Citizen): Người gửi báo cáo, người bình chọn.
Chính quyền (Admin/Authority): Người thẩm định tính đúng đắn của báo cáo.
Hệ thống (System): Smart Contract thực thi logic trả thưởng/phạt và lưu trữ bằng chứng.

## 3. Yêu cầu chức năng (Functional Requirements)
### Giai đoạn 1: Đăng ký & Định danh (Onboarding)
F1.1: Người dùng upload ảnh CCCD và nhập thông tin cá nhân.
F1.2: Hệ thống xác thực CCCD qua API định danh quốc gia (Off-chain). For this MVP, no verification, direct approval, register user and assign wallet.
F1.3: Nếu hợp lệ, hệ thống băm (Hash) CCCD + Salt để tạo mã định danh duy nhất trên chuỗi.
F1.4: Khởi tạo ví Blockchain gắn liền với tài khoản (Encrypted). For demo, this wallet is pre-generated with free testnet ETH.
F1.5: Yêu cầu bắt buộc: Người dùng nộp phí ký quỹ x để kích hoạt trạng thái Active.

### Giai đoạn 2: Quản lý bản nháp (Drafting - Off-chain/IPFS)
F2.1: Tạo báo cáo mới (Nội dung text, địa điểm).
F2.2: Upload ảnh bằng chứng lên IPFS, nhận về mã CID.
F2.3: CRUD Nháp (Lưu tại local/DB tạm):
Create: Thêm ảnh mới.
Read: Xem lại nội dung đã soạn.
Update: Sửa text, thay đổi ảnh.
Delete: Xóa nháp.

### Giai đoạn 3: Gửi báo cáo (Submission - On-chain)
F3.1: Người dùng nộp "Phí gửi báo cáo".
F3.2: Smart Contract lưu trữ: Reporter Address, Content Hash, Image CIDs, Timestamp.
F3.3: Ràng buộc sau Submit:
Không được xóa (D) nội dung/ảnh cũ.
Được phép đọc (R).
Được phép cập nhật (U) mô tả bổ sung.
Được phép thêm (C) ảnh bằng chứng mới tại hiện trường.
Được phép sửa (U) địa điểm


### Giai đoạn 4: Tương tác cộng đồng (Voting)
F4.1: Hiển thị danh sách báo cáo công khai cho tất cả người dân Active.
F4.2: Cơ chế Vote:
Vote Up: Tăng độ ưu tiên.
Vote Down: Giảm độ ưu tiên (nếu nghi ngờ tin giả).
F4.3: Thuật toán sắp xếp: Score = Count(Up) - Count(Down). Sự việc Score cao nhất nằm đầu Queue xử lý của Chính quyền.

### Giai đoạn 5: Thẩm định & Quyết toán (Resolution)
F5.1: Admin (pregenrated account having a wallet with free ETH on sepolia testnet) xem xét bằng chứng và chọn Approve hoặc Reject.
F5.2: Smart Contract tự động phân phối ngân sách:
Trường hợp Approve: - Người báo cáo nhận lại x + phí gửi + thưởng y.
Người Vote Up nhận thưởng y.
Người Vote Down bị trừ y vào quỹ ký quỹ x.
Trường hợp Reject: - Người báo cáo mất phí gửi + bị phạt trừ y vào x.
Người Vote Up bị phạt trừ y vào x.
Người Vote Down được chia đều tổng quỹ phạt của phe Up: (n * y) / m.
F5.3: Khóa tài khoản tự động nếu số dư ký quỹ x \le 0. Yêu cầu nộp thêm để mở khóa.

## 4. Yêu cầu kỹ thuật (Technical Requirements)
Kiến trúc dữ liệu (Smart Contract)
Data Structure:
enum Status { Draft, Submitted, Approved, Rejected }
struct Report {
    address reporter;
    string contentHash; 
    string[] imageCIDs;
    int256 score;
    Status status;
}
Storage: Ảnh lưu trên IPFS (Pinata/Infura). Metadata lưu trên Blockchain (Polygon/BNB Chain để phí thấp).
Bảo mật (Security)
Identity: Chỉ lưu Hash của CCCD trên chuỗi để đảm bảo quyền riêng tư (GDPR/Luật dữ liệu).
Anti-Spam: Phí ký quỹ x và phí báo cáo là rào cản tài chính bắt buộc.

No additional on-chain payments needed for F3.3 updates. Use a single updatable Report struct with arrays and mutable fields—most economical design matching your SRS exactly.

Recommended Smart Contract Design
```solidity
enum Status { Draft, Submitted, Approved, Rejected }
struct Report {
    address reporter;
    string contentHash;        
    string[] imageCIDs;        
    string location;           
    int256 score;
    Status status;
    uint256 timestamp;
    mapping(uint => bool) validImageIndices; // Track original vs added
}

mapping(uint256 => Report) public reports;
uint256 public reportCount;

function submitReport(string memory _contentHash, string[] memory _imageCIDs, string memory _location) external payable {
    require(msg.value == REPORT_FEE, "Incorrect report fee");
    require(stakes[msg.sender] >= STAKE_AMOUNT, "Not active citizen");
    
    uint256 reportId = reportCount++;
    Report storage report = reports[reportId];
    report.reporter = msg.sender;
    report.contentHash = _contentHash;
    report.imageCIDs = _imageCIDs; // Can push later
    report.location = _location;
    report.timestamp = block.timestamp;
    report.validImageIndices[0] = true; // Mark originals valid
}

function updateReport(uint256 _reportId, string memory _newContent, string[] memory _newImages, string memory _newLocation) external {
    Report storage report = reports[_reportId];
    require(report.reporter == msg.sender, "Not reporter");
    require(report.status == Status.Submitted, "Cannot update");
    
    // F3.3 Allowed Updates (NO GAS FEE)
    report.contentHash = _newContent;  // Supplemental description
    report.location = _newLocation;    // Location correction
    
    // Add new images (append only)
    for(uint i = 0; i < _newImages.length; i++) {
        report.imageCIDs.push(_newImages[i]);
        report.validImageIndices[report.imageCIDs.length - 1] = true;
    }
}
Total Cost: Only initial REPORT_FEE at F3.1. Updates = zero additional payments.

Frontend Implementation
tsx
// Only pay once on initial submit
const submitReport = async (draftId: number) => {
  const { cid: contentCid } = await uploadToIPFS(content);
  const imageCids = await Promise.all(images.map(uploadToIPFS));
  
  const tx = await writeContract({
    address: PUBLIC_SERVICE,
    abi: abi,
    functionName: 'submitReport',
    args: [contentCid, imageCids, location],
    value: REPORT_FEE, // ONE-TIME PAYMENT
  });
};

// Later updates FREE
const updateReport = async (reportId: number) => {
  const newContentCid = await uploadToIPFS(supplementalText);
  const newImageCids = await uploadNewImages();
  
  await writeContract({
    address: PUBLIC_SERVICE,
    abi: abi,
    functionName: 'updateReport', 
    args: [reportId, newContentCid, newImageCids, newLocation],
    // NO value: FREE UPDATE
  });
};
```
Gas Cost Breakdown
text
Initial Submit: REPORT_FEE (MATIC) + ~150k gas
Content Update: ~80k gas (NO payment)
Add 1 Image: ~100k gas (NO payment) 

## 5. Giao diện người dùng (UI/UX Priorities cho MVP)
Dashboard: Hiển thị Queue báo cáo theo Score.
Camera Interface: Tích hợp chụp ảnh và đóng dấu tọa độ (Metadata).
Wallet View: Hiển thị số dư ký quỹ và lịch sử nhận thưởng/phạt.
Admin Portal: Danh sách chờ duyệt với bộ lọc độ ưu tiên cao nhất.

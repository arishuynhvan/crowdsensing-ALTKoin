// Sau khi dev2 xong database thì thay nguyên đoạn let reports bằng dòng này:
// export const API_URL = "http://localhost:3000"; // backend dev 2


// Sau đó các API dưới sửa theo kiểu giống thế này:
// export async function submitReport(data: any) {
//   const res = await fetch(`${API_URL}/reports/submit`, {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//     },
//     body: JSON.stringify(data),
//   });


//   return res.json();
// }




// Do chưa có database và API từ dev2 nên tạo database giả lập trước để test
// Fake database (giả lập)
let reports = [
    { id: 1, content: "Ổ gà trên đường", score: 5, status: "Chờ kiểm duyệt" },
    { id: 2, content: "Rác thải đầy vỉa hè", score: 2, status: "Chờ kiểm duyệt" },
];


// Gửi báo cáo (fake)
export async function submitReport(data: any) {
    const newReport = {
        id: reports.length + 1,
        content: data.content,
        score: 0,
        status: "Chờ kiểm duyệt",
    };


    reports.push(newReport);


    return newReport;
}


// Lấy danh sách báo cáo
export async function getReports() {
    return reports;
}


// Vote
export async function voteReport(id: number, type: "up" | "down") {
    const report = reports.find((r) => r.id === id);


    if (report) {
        if (type === "up") report.score += 1;
        else report.score -= 1;
    }


    return report;
}


// Fake database cho wallet
let balance = 100; // số dư ban đầu (x)
let history: string[] = [];


// Lấy wallet
export async function getWallet() {
    return {
        balance,
        history,
    };
}


// Kiểm duyệt - Quyết định thưởng phạt
// Chấp thuận
export async function approveReport(id: number) {
    const report = reports.find((r) => r.id === id);


    if (report && report.status === "Chờ kiểm duyệt") {
        report.status = "Chấp thuận";


        balance += 10; // thưởng
        history.push(`+10: Báo cáo #${id} được duyệt`);
    }


    return report;
}


// Từ chối
export async function rejectReport(id: number) {
    const report = reports.find((r) => r.id === id);


    if (report && report.status === "Chờ kiểm duyệt") {
        report.status = "Từ chối";


        balance -= 5; // phạt
        history.push(`-5: Báo cáo #${id} bị từ chối`);
    }


    return report;
}

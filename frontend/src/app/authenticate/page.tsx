"use client";


import { useEffect, useState } from "react";
import { getReports, approveReport, rejectReport } from "@/lib/api";


export default function GovPage() {
    const [reports, setReports] = useState<any[]>([]);


    const loadData = async () => {
        const data = await getReports();
        setReports([...data]);
    };


    useEffect(() => {
        loadData();
    }, []);


    const handleApprove = async (id: number) => {
        await approveReport(id);
        loadData();
    };


    const handleReject = async (id: number) => {
        await rejectReport(id);
        loadData();
    };


    return (
        <div style={{ padding: 20 }}>
            <h1>🛠 Gov - Duyệt báo cáo</h1>


            {reports.map((r) => (
                <div
                    key={r.id}
                    style={{
                        border: "1px solid gray",
                        padding: 10,
                        marginBottom: 10,
                    }}
                >
                    <p>
                        <b>Nội dung:</b> {r.content}
                    </p>
                    <p>
                        <b>Score:</b> {r.score}
                    </p>
                    <p>
                        <b>Trạng thái:</b>{" "}
                        <span
                            style={{
                                color:
                                    r.status === "Chấp thuận"
                                        ? "green"
                                        : r.status === "Từ chối"
                                            ? "red"
                                            : "orange",
                            }}
                        >
                            {r.status}
                        </span>
                    </p>


                    {r.status === "Chờ kiểm duyệt" && (
                        <>
                            <button onClick={() => handleApprove(r.id)}>✅ Chấp thuận</button>


                            <button
                                onClick={() => handleReject(r.id)}
                                style={{ marginLeft: 10 }}
                            >
                                ❌ Từ chối
                            </button>
                        </>
                    )}
                </div>
            ))}
        </div>
    );
}

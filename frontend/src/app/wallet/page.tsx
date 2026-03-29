"use client";


import { useEffect, useState } from "react";
import { getWallet } from "@/lib/api";


export default function WalletPage() {
    const [wallet, setWallet] = useState<any>(null);


    const loadData = async () => {
        const data = await getWallet();
        setWallet(data);
    };


    useEffect(() => {
        loadData();
    }, []);


    if (!wallet) return <p>Loading...</p>;


    return (
        <div style={{ padding: 20 }}>
            <h1>💰 Ví của bạn</h1>


            <h2>Số dư: {wallet.balance}</h2>


            <h3>Lịch sử:</h3>


            <ul>
                {wallet.history.map((h: string, index: number) => (
                    <li key={index}>{h}</li>
                ))}
            </ul>
        </div>
    );
}

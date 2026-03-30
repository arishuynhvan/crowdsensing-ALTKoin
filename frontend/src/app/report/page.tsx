"use client";

import { Box, Heading, VStack, Button, Text } from "@chakra-ui/react";
import { useEffect, useState } from "react";

import Header from "@/components/header";
import Footer from "@/components/footer";
import RoleGate from "@/components/roleGate";
import ReportEditor from "@/components/reportEditor";
import { getReports, type ReportItem } from "@/lib/api";

type Draft = {
    id: number;
    content: string;
    cids: string[];
    location: string;
    latitude: number | null;
    longitude: number | null;
    submitted: boolean;
};

export default function ReportPage() {
    const [drafts, setDrafts] = useState<Draft[]>([]);
    const [reports, setReports] = useState<ReportItem[]>([]);
    const [selected, setSelected] = useState<Draft | null>(null);

    const loadReports = async () => {
        try {
            const data = await getReports();
            setReports(data);
        } catch {
            // Keep UI usable even if API temporarily fails.
        }
    };

    const loadDrafts = async () => {
        try {
            const user =
                typeof window !== "undefined"
                    ? JSON.parse(localStorage.getItem("user") || "{}")
                    : null;
            const reporter = user?.walletAddress || user?.identifier;
            if (!reporter) return;

            const res = await fetch(`/api/drafts?reporter=${encodeURIComponent(reporter)}`);
            if (!res.ok) return;
            const data = (await res.json()) as Array<{
                id: number;
                content: string | null;
                image_cids: string | string[] | null;
                location: string | null;
                latitude: number | null;
                longitude: number | null;
            }>;
            const mapped: Draft[] = (data || []).map((d) => ({
                id: d.id,
                content: d.content || "",
                cids: Array.isArray(d.image_cids)
                    ? d.image_cids
                    : JSON.parse(d.image_cids || "[]"),
                location: d.location || "",
                latitude: typeof d.latitude === "number" ? d.latitude : null,
                longitude: typeof d.longitude === "number" ? d.longitude : null,
                submitted: false,
            }));
            setDrafts(mapped);
        } catch {
            // ignore draft load failures
        }
    };

    useEffect(() => {
        const init = async () => {
            try {
                const data = await getReports();
                setReports(data);
                await loadDrafts();
            } catch {
                // Keep UI usable even if API temporarily fails.
            }
        };
        void init();
    }, []);

    // ======================
    // SAVE DRAFT
    // ======================
    const handleSaveDraft = (draft: Draft) => {
        setDrafts((prev) => {
            const exists = prev.find((d) => d.id === draft.id);
            if (exists) {
                return prev.map((d) => (d.id === draft.id ? draft : d));
            }
            return [...prev, draft];
        });
    };

    // ======================
    // SUBMIT SUCCESS
    // ======================
    const handleSubmitSuccess = () => {
        void loadReports();
        void loadDrafts();

        // remove khỏi draft list nếu đã submit
        setSelected(null);

    };

    return (
        <RoleGate allowedRoles={["CIT"]}>
            <Box minH="100vh" display="flex" flexDirection="column">
                <Header />

                <Box maxW="900px" mx="auto" mt={6} w="100%" px={4} flex="1">
                    <Heading mb={4}>📢 Quản lý báo cáo vi phạm</Heading>

                {/* EDITOR */}
                <ReportEditor
                    key={selected?.id || "new"}
                    initialData={selected}
                    onSaveDraft={handleSaveDraft}
                    onSubmitSuccess={handleSubmitSuccess}
                />

                {/* ================= DRAFT LIST ================= */}
                <Heading size="md" mt={6}>
                    📂 Bản nháp
                </Heading>

                <VStack align="stretch">
                    {drafts.map((d) => (
                        <Box key={d.id} borderWidth="1px" p={3}>
                            <Text>{d.content.slice(0, 50)}</Text>

                            <Button size="sm" onClick={() => setSelected(d)}>
                                ✏️ Chỉnh sửa
                            </Button>
                        </Box>
                    ))}
                </VStack>

                {/* ================= REPORT LIST ================= */}
                <Heading size="md" mt={6}>
                    📊 Báo cáo đã gửi
                </Heading>

                <VStack align="stretch">
                    {reports.map((r) => (
                        <Box key={r.id} borderWidth="1px" p={3}>
                            <Text>{r.content}</Text>
                            <Text fontSize="sm">📍 {r.location}</Text>
                            <Text fontSize="sm" color="gray.500">
                                {r.cids?.length || 0} ảnh | Score: {r.score}
                            </Text>
                            <Text fontSize="xs" color="gray.600">
                                On-chain Tx:{" "}
                                {r.lastTxHash ? (
                                    <a
                                        href={`https://sepolia.etherscan.io/tx/${r.lastTxHash}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        style={{ color: "#2563eb", textDecoration: "underline" }}
                                    >
                                        {r.lastTxHash.slice(0, 10)}...{r.lastTxHash.slice(-8)}
                                    </a>
                                ) : (
                                    "Chưa có"
                                )}
                            </Text>
                        </Box>
                    ))}
                </VStack>
                </Box>

                <Footer />
            </Box>
        </RoleGate>
    );
}

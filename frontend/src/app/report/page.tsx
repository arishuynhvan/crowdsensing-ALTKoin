"use client";

import { Box, Heading, VStack, Button, Text } from "@chakra-ui/react";
import { useState } from "react";

import Header from "@/components/header";
import Footer from "@/components/footer";
import ReportEditor from "@/components/reportEditor";

export default function ReportPage() {
    const [drafts, setDrafts] = useState<any[]>([]);
    const [reports, setReports] = useState<any[]>([]);
    const [selected, setSelected] = useState<any | null>(null);

    // ======================
    // SAVE DRAFT
    // ======================
    const handleSaveDraft = (draft: any) => {
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
    const handleSubmitSuccess = (report: any) => {
        setReports((prev) => [...prev, report]);

        // remove khỏi draft list nếu đã submit
        setDrafts((prev) => prev.filter((d) => d.id !== report.id));

        setSelected(null);
    };

    return (
        <>
            <Header />

            <Box maxW="900px" mx="auto" mt={6}>
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
                    {reports.map((r, i) => (
                        <Box key={i} borderWidth="1px" p={3}>
                            <Text>{r.content}</Text>
                            <Text fontSize="sm" color="gray.500">
                                {r.cids?.length || 0} ảnh
                            </Text>
                        </Box>
                    ))}
                </VStack>
            </Box>

            <Footer />
        </>
    );
}

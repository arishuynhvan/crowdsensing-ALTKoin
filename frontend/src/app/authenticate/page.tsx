"use client";

import { useEffect, useState } from "react";
import { Box, Heading, Text, Button, VStack, HStack } from "@chakra-ui/react";
import { getReports, approveReport, rejectReport, type ReportItem } from "@/lib/api";
import Header from "@/components/header";
import Footer from "@/components/footer";

export default function GovPage() {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loadingId, setLoadingId] = useState<number | null>(null);

  const loadData = async () => {
    const data = await getReports();
    setReports([...data]);
  };

  useEffect(() => {
    const init = async () => {
      await loadData();
    };
    void init();
  }, []);

  const handleApprove = async (id: number) => {
    setLoadingId(id);
    try {
      await approveReport(id);
      await loadData();
    } finally {
      setLoadingId(null);
    }
  };

  const handleReject = async (id: number) => {
    setLoadingId(id);
    try {
      await rejectReport(id);
      await loadData();
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <Box minH="100vh" display="flex" flexDirection="column">
      <Header />

      <Box maxW="900px" mx="auto" mt={6} w="100%" px={4} flex="1">
        <Heading mb={4}>🛠 Gov - Duyệt báo cáo</Heading>

        <VStack align="stretch" spacing={4}>
          {reports.map((r) => (
            <Box key={r.id} borderWidth="1px" p={4} borderRadius="md">
              <Text>
                <b>Nội dung:</b> {r.content}
              </Text>
              <Text>
                <b>Score:</b> {r.score}
              </Text>
              <Text>
                <b>Trạng thái:</b> {r.status}
              </Text>

              {r.status === "Chờ kiểm duyệt" && (
                <HStack mt={3}>
                  <Button
                    colorScheme="green"
                    onClick={() => handleApprove(r.id)}
                    isLoading={loadingId === r.id}
                  >
                    ✅ Chấp thuận
                  </Button>

                  <Button
                    colorScheme="red"
                    onClick={() => handleReject(r.id)}
                    isLoading={loadingId === r.id}
                  >
                    ❌ Từ chối
                  </Button>
                </HStack>
              )}
            </Box>
          ))}
        </VStack>
      </Box>

      <Footer />
    </Box>
  );
}

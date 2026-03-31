"use client";

import { useEffect, useState } from "react";
import { Box, Heading, Text, Button, VStack, HStack } from "@chakra-ui/react";
import { getReports, approveReport, rejectReport, type ReportItem } from "@/lib/api";
import Header from "@/components/header";
import Footer from "@/components/footer";
import RoleGate from "@/components/roleGate";

export default function GovPage() {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

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
    setNotice("");
    setError("");
    try {
      const updated = await approveReport(id);
      await loadData();
      setNotice(
        `Đã duyệt báo cáo #${id} thành công. Smart contract đã resolve và phân phối quỹ/phạt. Tx: ${updated.lastTxHash ?? "N/A"}`
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Không thể duyệt báo cáo.";
      setError(message);
    } finally {
      setLoadingId(null);
    }
  };

  const handleReject = async (id: number) => {
    setLoadingId(id);
    setNotice("");
    setError("");
    try {
      const updated = await rejectReport(id);
      await loadData();
      setNotice(
        `Đã từ chối báo cáo #${id} thành công. Smart contract đã resolve và phân phối quỹ/phạt. Tx: ${updated.lastTxHash ?? "N/A"}`
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Không thể từ chối báo cáo.";
      setError(message);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <RoleGate allowedRoles={["GOV"]}>
      <Box minH="100vh" display="flex" flexDirection="column">
        <Header />

      <Box maxW="900px" mx="auto" mt={6} w="100%" px={4} flex="1">
        <Heading mb={4}>🛠 Gov - Duyệt báo cáo</Heading>
        {notice && (
          <Text mb={3} color="green.600">
            {notice}
          </Text>
        )}
        {error && (
          <Text mb={3} color="red.500">
            {error}
          </Text>
        )}

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
    </RoleGate>
  );
}

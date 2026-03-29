"use client";

import { Box, Text, VStack, Heading, Button, Select, HStack } from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";

import Header from "@/components/header";
import Footer from "@/components/footer";
import { getReports, voteReport, type ReportItem } from "@/lib/api";

type SortBy = "score" | "time";
type OrderBy = "asc" | "desc";

export default function VotingPage() {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [sortBy, setSortBy] = useState<SortBy>("score");
  const [order, setOrder] = useState<OrderBy>("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [votingReportId, setVotingReportId] = useState<number | null>(null);

  const pageSize = 5;

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      const apiData = await getReports();
      setReports(apiData);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Không thể tải danh sách báo cáo.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [sortBy, order]);

  const sortedReports = useMemo(() => {
    return [...reports].sort((a, b) => {
      const field = sortBy === "score" ? "score" : "timestamp";
      return order === "desc" ? b[field] - a[field] : a[field] - b[field];
    });
  }, [reports, sortBy, order]);

  const totalPages = Math.ceil(sortedReports.length / pageSize);

  const paginatedReports = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedReports.slice(start, start + pageSize);
  }, [sortedReports, currentPage]);

  const handleVote = async (report: ReportItem, type: "up" | "down") => {
    try {
      setVotingReportId(report.id);
      setError("");
      await voteReport(report.id, type, report.onchainReportId);
      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Vote thất bại.";
      setError(message);
    } finally {
      setVotingReportId(null);
    }
  };

  return (
    <Box minH="100vh" display="flex" flexDirection="column">
      <Header />

      <Box maxW="800px" mx="auto" mt={6} w="100%" px={4} flex="1">
        <Heading mb={4}>📊 Danh sách báo cáo</Heading>

        <HStack mb={4}>
          <Select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortBy)}>
            <option value="score">Theo điểm</option>
            <option value="time">Theo thời gian</option>
          </Select>

          <Select value={order} onChange={(e) => setOrder(e.target.value as OrderBy)}>
            <option value="desc">Giảm dần</option>
            <option value="asc">Tăng dần</option>
          </Select>
        </HStack>

        {error && (
          <Text mb={3} color="red.500">
            {error}
          </Text>
        )}

        {loading ? (
          <Text>Đang tải dữ liệu...</Text>
        ) : (
          <VStack spacing={4} align="stretch">
            {paginatedReports.map((r) => (
              <Box key={r.id} borderWidth="1px" borderRadius="lg" p={4}>
                <Text mb={2}>{r.content}</Text>
                <Text fontSize="sm">📍 {r.location}</Text>

                <Text fontSize="sm" color="gray.500">
                  Score: {r.score} | {new Date(r.timestamp).toLocaleString()}
                </Text>

                <Text fontSize="xs" color="gray.500" mt={1}>
                  {r.onchainReportId !== null
                    ? `Onchain Report ID: ${r.onchainReportId}`
                    : "Chưa đồng bộ on-chain"}
                </Text>

                <HStack mt={3}>
                  <Button
                    size="sm"
                    colorScheme="green"
                    onClick={() => handleVote(r, "up")}
                    isLoading={votingReportId === r.id}
                  >
                    👍+1 điểm
                  </Button>
                  <Button
                    size="sm"
                    colorScheme="red"
                    onClick={() => handleVote(r, "down")}
                    isLoading={votingReportId === r.id}
                  >
                    👎-1 điểm
                  </Button>
                </HStack>
              </Box>
            ))}
          </VStack>
        )}

        <HStack mt={6} justify="center">
          <Button
            onClick={() => setCurrentPage((p) => p - 1)}
            isDisabled={currentPage === 1}
          >
            Trang trước
          </Button>

          <Text>
            Trang {currentPage} / {totalPages || 1}
          </Text>

          <Button
            onClick={() => setCurrentPage((p) => p + 1)}
            isDisabled={currentPage === totalPages || totalPages === 0}
          >
            Trang sau
          </Button>
        </HStack>
      </Box>

      <Footer />
    </Box>
  );
}

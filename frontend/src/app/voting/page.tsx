"use client";


import {
    Box,
    Text,
    VStack,
    Heading,
    Button,
    Select,
    HStack,
} from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";


import Header from "@/components/header";
import Footer from "@/components/footer";
import { getReports, voteReport } from "@/lib/api";
import { getLocalReports } from "@/lib/reportStore";


type Report = {
    id: number;
    content: string;
    score: number;
    timestamp: number;
};


export default function VotingPage() {
    const [reports, setReports] = useState<Report[]>([]);
    const [sortBy, setSortBy] = useState<"score" | "time">("score");
    const [order, setOrder] = useState<"asc" | "desc">("desc");
    const [currentPage, setCurrentPage] = useState(1);


    const pageSize = 5;


    // ======================
    // LOAD DATA (only once)
    // ======================
    const loadData = async () => {
        const apiData = await getReports();
        const localData = getLocalReports();


        const mapped: Report[] = apiData.map((r: Partial<Report>) => ({
            id: r.id!,
            content: r.content!,
            score: r.score ?? 0,
            timestamp: r.timestamp ?? Date.now(),
        }));


        setReports([...localData, ...mapped]);
    };


    useEffect(() => {
        loadData();
    }, []);


    useEffect(() => {
        setCurrentPage(1);
    }, [sortBy, order]);


    useEffect(() => {
        const handleFocus = () => loadData();
        window.addEventListener("focus", handleFocus);
        return () => window.removeEventListener("focus", handleFocus);
    }, []);


    // ======================
    // SORT (memoized)
    // ======================
    const sortedReports = useMemo(() => {
        return [...reports].sort((a, b) => {
            const field = sortBy === "score" ? "score" : "timestamp";
            return order === "desc" ? b[field] - a[field] : a[field] - b[field];
        });
    }, [reports, sortBy, order]);


    // ======================
    // PAGINATION
    // ======================
    const totalPages = Math.ceil(sortedReports.length / pageSize);


    const paginatedReports = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return sortedReports.slice(start, start + pageSize);
    }, [sortedReports, currentPage]);


    // ======================
    // VOTE
    // ======================
    const handleVote = async (id: number, type: "up" | "down") => {
        await voteReport(id, type);
        loadData();
    };


    // ======================
    // UI
    // ======================
    return (
        <>
            <Header />


            <Box maxW="800px" mx="auto" mt={6}>
                <Heading mb={4}>📊 Danh sách báo cáo</Heading>


                {/* FILTER */}
                <HStack mb={4}>
                    <Select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                    >
                        <option value="score">Theo điểm</option>
                        <option value="time">Theo thời gian</option>
                    </Select>


                    <Select
                        value={order}
                        onChange={(e) => setOrder(e.target.value as any)}
                    >
                        <option value="desc">Giảm dần</option>
                        <option value="asc">Tăng dần</option>
                    </Select>
                </HStack>


                {/* LIST */}
                <VStack spacing={4} align="stretch">
                    {paginatedReports.map((r) => (
                        <Box key={r.id} borderWidth="1px" borderRadius="lg" p={4}>
                            <Text mb={2}>{r.content}</Text>


                            <Text fontSize="sm" color="gray.500">
                                Score: {r.score} | {new Date(r.timestamp).toLocaleString()}
                            </Text>


                            <HStack mt={3}>
                                <Button
                                    size="sm"
                                    colorScheme="green"
                                    onClick={() => handleVote(r.id, "up")}
                                >
                                    👍+1 điểm
                                </Button>
                                <Button
                                    size="sm"
                                    colorScheme="red"
                                    onClick={() => handleVote(r.id, "down")}
                                >
                                    👎-1 điểm
                                </Button>
                            </HStack>
                        </Box>
                    ))}
                </VStack>


                {/* PAGINATION */}
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
        </>
    );
}

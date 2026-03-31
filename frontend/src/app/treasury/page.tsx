"use client";

import { useEffect, useState } from "react";
import { Box, Heading, Text, VStack, Link } from "@chakra-ui/react";
import Header from "@/components/header";
import Footer from "@/components/footer";
import RoleGate from "@/components/roleGate";
import { getTreasurySummary, type TreasurySummary } from "@/lib/api";

export default function TreasuryPage() {
  const [treasury, setTreasury] = useState<TreasurySummary | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setError("");
        const data = await getTreasurySummary();
        setTreasury(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Không thể tải treasury.";
        setError(message);
      }
    };
    void load();
  }, []);

  return (
    <RoleGate allowedRoles={["CIT", "GOV"]}>
      <Box minH="100vh" display="flex" flexDirection="column">
        <Header />

        <Box maxW="800px" mx="auto" mt={6} w="100%" px={4} flex="1">
          <Heading mb={4}>🏦 Treasury</Heading>

          {error && (
            <Text mb={3} color="red.500">
              {error}
            </Text>
          )}

          {!treasury ? (
            <Text>Loading...</Text>
          ) : (
            <VStack align="stretch" spacing={3}>
              <Text>
                <b>Treasury balance trong contract (ETH):</b> {treasury.treasuryEth}
              </Text>
              <Text>
                <b>Tổng ETH contract hiện giữ (ETH):</b> {treasury.contractEth}
              </Text>
              <Text>
                <b>Contract:</b> {treasury.contractAddress ?? "N/A"}
              </Text>
              {treasury.contractUrl && (
                <Text>
                  <b>Sepolia Etherscan:</b>{" "}
                  <Link href={treasury.contractUrl} isExternal color="blue.500" textDecoration="underline">
                    Xem contract
                  </Link>
                </Text>
              )}
              {treasury.readContractUrl && (
                <Text>
                  <b>Đọc treasuryBalance trực tiếp:</b>{" "}
                  <Link href={treasury.readContractUrl} isExternal color="blue.500" textDecoration="underline">
                    Read Contract
                  </Link>
                </Text>
              )}
            </VStack>
          )}
        </Box>

        <Footer />
      </Box>
    </RoleGate>
  );
}

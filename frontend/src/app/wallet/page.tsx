"use client";

import { useEffect, useState } from "react";
import { Box, Heading, Text, VStack } from "@chakra-ui/react";
import { getWallet, type WalletSummary } from "@/lib/api";
import Header from "@/components/header";
import Footer from "@/components/footer";
import RoleGate from "@/components/roleGate";

export default function WalletPage() {
  const [wallet, setWallet] = useState<WalletSummary | null>(null);

  const loadData = async () => {
    const data = await getWallet();
    setWallet(data);
  };

  useEffect(() => {
    const init = async () => {
      await loadData();
    };
    void init();
  }, []);

  return (
    <RoleGate allowedRoles={["CIT"]}>
      <Box minH="100vh" display="flex" flexDirection="column">
        <Header />

      <Box maxW="800px" mx="auto" mt={6} w="100%" px={4} flex="1">
        <Heading mb={4}>💰 Ví của bạn</Heading>

        {!wallet ? (
          <Text>Loading...</Text>
        ) : (
          <VStack align="stretch" spacing={3}>
            <Text>
              <b>Ví:</b> {wallet.walletAddress ?? "N/A"}
            </Text>
            <Text>
              <b>Số dư ví ngoài contract (ETH):</b> {wallet.walletEth}
            </Text>
            <Text>
              <b>Stake yêu cầu (ETH):</b> {wallet.requiredStakeEth}
            </Text>
            <Text>
              <b>Funding/stake đang giữ trong contract (ETH):</b> {wallet.citizenStakeEth}
            </Text>
            <Text>
              <b>Trạng thái khóa:</b> {wallet.isLocked ? "Đang khóa" : "Bình thường"}
            </Text>
            <Text>
              <b>Có thể gửi report:</b> {wallet.canSubmitReport ? "Có" : "Không"}
            </Text>

            <Text fontWeight="bold">Lịch sử:</Text>
            {wallet.history.length === 0 ? (
              <Text color="gray.500">Chưa có lịch sử.</Text>
            ) : (
              wallet.history.map((h, index) => <Text key={index}>- {h}</Text>)
            )}
          </VStack>
        )}
      </Box>

        <Footer />
      </Box>
    </RoleGate>
  );
}

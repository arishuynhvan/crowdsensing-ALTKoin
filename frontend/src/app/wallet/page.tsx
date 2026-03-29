"use client";

import { useEffect, useState } from "react";
import { Box, Heading, Text, VStack } from "@chakra-ui/react";
import { getWallet } from "@/lib/api";
import Header from "@/components/header";
import Footer from "@/components/footer";

type WalletData = {
  balance: number;
  history: string[];
};

export default function WalletPage() {
  const [wallet, setWallet] = useState<WalletData | null>(null);

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
    <Box minH="100vh" display="flex" flexDirection="column">
      <Header />

      <Box maxW="800px" mx="auto" mt={6} w="100%" px={4} flex="1">
        <Heading mb={4}>💰 Ví của bạn</Heading>

        {!wallet ? (
          <Text>Loading...</Text>
        ) : (
          <VStack align="stretch" spacing={3}>
            <Text>
              <b>Số dư:</b> {wallet.balance}
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
  );
}

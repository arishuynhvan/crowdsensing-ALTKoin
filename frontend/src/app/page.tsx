"use client";


import { Box, VStack, Heading, Text, Button, Image } from "@chakra-ui/react";
import { useRouter } from "next/navigation";


export default function Home() {
  const router = useRouter();


  return (
    <Box
      minH="100vh"
      bgGradient="linear(to-br, blue.500, purple.600)"
      display="flex"
      alignItems="center"
      justifyContent="center"
      color="white"
    >
      <VStack spacing={6} textAlign="center">
        {/* Logo */}
        <Image
          src="/logo.png"
          alt="App Logo"
          boxSize="120px"
          borderRadius="full"
          bg="white"
          p={2}
        />


        {/* Tên app */}
        <Heading size="2xl">MVP</Heading>


        {/* Mô tả */}
        <Text fontSize="lg" maxW="400px">
          Nền tảng báo cáo sự cố cộng đồng, giúp công dân và chính phủ cùng xây
          dựng môi trường sống tốt hơn.
        </Text>


        {/* Buttons */}
        <VStack spacing={3} w="200px">
          <Button
            w="100%"
            variant="outline"
            colorScheme="whiteAlpha"
            onClick={() => router.push("/login")}
          >
            Đăng nhập
          </Button>


          <Button
            w="100%"
            bg="white"
            color="black"
            _hover={{ bg: "gray.200" }}
            onClick={() => router.push("/register")}
          >
            Đăng ký
          </Button>
        </VStack>
      </VStack>
    </Box>
  );
}

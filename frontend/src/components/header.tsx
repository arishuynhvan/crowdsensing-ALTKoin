"use client";


import { Box, Flex, Text, Button } from "@chakra-ui/react";
import { useRouter } from "next/navigation";


export default function Header() {
    const router = useRouter();


    const handleLogout = () => {
        localStorage.removeItem("user");
        router.push("/");
    };


    return (
        <Box bg="blue.600" color="white" px={6} py={3}>
            <Flex justify="space-between" align="center">
                <Text fontWeight="bold">🚀 MVP App</Text>


                <Button size="sm" onClick={handleLogout}>
                    Đăng xuất
                </Button>
            </Flex>
        </Box>
    );
}

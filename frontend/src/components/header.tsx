"use client";


import { Box, Flex, Text, Button, HStack } from "@chakra-ui/react";
import { usePathname, useRouter } from "next/navigation";


export default function Header() {
    const router = useRouter();
    const pathname = usePathname();

    const navItems = [
        { label: "Report", path: "/report" },
        { label: "Voting", path: "/voting" },
        { label: "Wallet", path: "/wallet" },
        { label: "Admin", path: "/authenticate" },
    ];


    const handleLogout = () => {
        localStorage.removeItem("user");
        router.push("/");
    };


    return (
        <Box bg="blue.600" color="white" px={6} py={3}>
            <Flex justify="space-between" align="center" gap={4} wrap="wrap">
                <HStack spacing={3}>
                    <Text fontWeight="bold" cursor="pointer" onClick={() => router.push("/")}>
                        🚀 MVP App
                    </Text>
                    <HStack spacing={2}>
                        {navItems.map((item) => (
                            <Button
                                key={item.path}
                                size="sm"
                                variant={pathname === item.path ? "solid" : "outline"}
                                colorScheme="whiteAlpha"
                                onClick={() => router.push(item.path)}
                            >
                                {item.label}
                            </Button>
                        ))}
                    </HStack>
                </HStack>

                <Button size="sm" colorScheme="red" onClick={handleLogout}>
                    Đăng xuất
                </Button>
            </Flex>
        </Box>
    );
}

"use client";


import { Box, Flex, Text, Button, HStack } from "@chakra-ui/react";
import { useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";

type Role = "CIT" | "GOV";

export default function Header() {
    const router = useRouter();
    const pathname = usePathname();
    const role: Role | null = (() => {
        if (typeof window === "undefined") return null;
        const raw = localStorage.getItem("user");
        if (!raw) return null;
        try {
            const user = JSON.parse(raw);
            if (user?.role === "GOV" || user?.role === "CIT") {
                return user.role as Role;
            }
        } catch {
            return null;
        }
        return null;
    })();

    const navItems = useMemo(() => {
        if (role === "GOV") {
            return [
                { label: "Admin", path: "/admin" },
                { label: "Treasury", path: "/treasury" },
            ];
        }
        return [
            { label: "Report", path: "/report" },
            { label: "Voting", path: "/voting" },
            { label: "Wallet", path: "/wallet" },
            { label: "Treasury", path: "/treasury" },
        ];
    }, [role]);


    const handleLogout = async () => {
        try {
            await fetch("/api/auth/logout", {
                method: "POST",
                credentials: "include",
            });
        } catch {
            // fallback to local cleanup only
        }
        localStorage.removeItem("user");
        router.push("/");
    };


    return (
        <Box bg="blue.600" color="white" px={6} py={3}>
            <Flex justify="space-between" align="center" gap={4} wrap="wrap">
                <HStack spacing={3}>
                    <Text fontWeight="bold" cursor="pointer" onClick={() => router.push("/")}>
                        🚀 Crowdsensing DAO
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

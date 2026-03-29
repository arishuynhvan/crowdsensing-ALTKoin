"use client";


import { getUser } from "@/lib/auth";
import { Text } from "@chakra-ui/react";


export default function Protected({
    children,
    role,
}: {
    children: React.ReactNode;
    role: "GOV";
}) {
    const user = getUser();


    if (user.role !== role) {
        return <Text>Bạn không có quyền truy cập</Text>;
    }


    return <>{children}</>;
}

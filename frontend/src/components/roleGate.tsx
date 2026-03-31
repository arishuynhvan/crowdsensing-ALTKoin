"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Box, Text } from "@chakra-ui/react";

type Role = "CIT" | "GOV";

export default function RoleGate({
  allowedRoles,
  children,
}: {
  allowedRoles: Role[];
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const res = await fetch("/api/auth/me", {
          method: "GET",
          credentials: "include",
        });
        if (!res.ok) {
          router.replace("/login");
          return;
        }

        const data = await res.json();
        const role = data?.user?.role as Role | undefined;
        if (!role) {
          router.replace("/login");
          return;
        }

        localStorage.setItem("user", JSON.stringify(data.user));

        if (!allowedRoles.includes(role)) {
          router.replace(role === "GOV" ? "/admin" : "/voting");
          return;
        }

        setAllowed(true);
      } catch {
        router.replace("/login");
      } finally {
        setLoading(false);
      }
    };

    void checkAccess();
  }, [allowedRoles, router]);

  if (loading) {
    return (
      <Box p={6}>
        <Text>Đang kiểm tra quyền truy cập...</Text>
      </Box>
    );
  }

  if (!allowed) return null;
  return <>{children}</>;
}


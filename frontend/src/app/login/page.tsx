"use client";


import { Box, Text, Button, VStack, Heading } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";


// COMPONENT
import FormInput from "@/components/formInput";
import PasswordInput from "@/components/passwordInput";


export default function LoginPage() {
    const router = useRouter();


    // ======================
    // STATE
    // ======================
    const [form, setForm] = useState({
        identifier: "", // hash CCCD hoặc wallet - chọn 1 trong 2 đều được
        // cccd:"", hoặc cũng có thể đăng nhập hẳn bằng số cccd luôn
        password: "",
    });


    const [touched, setTouched] = useState({
        identifier: false,
        password: false,
    });


    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);


    // ======================
    // HANDLER
    // ======================
    const handleChange = (field: keyof typeof form, value: string) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };


    const handleBlur = (field: keyof typeof form) => {
        setTouched((prev) => ({ ...prev, [field]: true }));
    };


    // ======================
    // VALIDATION
    // ======================
    const isIdentifierValid = !!form.identifier;
    const isPasswordValid = !!form.password;


    const isFormValid = isIdentifierValid && isPasswordValid;


    useEffect(() => {
        const checkSession = async () => {
            try {
                const res = await fetch("/api/auth/me", {
                    method: "GET",
                    credentials: "include",
                });
                if (!res.ok) return;

                const data = await res.json();
                if (!data?.user) return;

                localStorage.setItem("user", JSON.stringify(data.user));
                if (data.user.role === "GOV") {
                    router.replace("/admin");
                } else {
                    router.replace("/voting");
                }
            } catch {
                // Ignore session check errors to keep login usable.
            }
        };

        checkSession();
    }, [router]);


    // ======================
    // HANDLE LOGIN
    // ======================
    const handleLogin = async () => {
        setError("");


        if (!isFormValid) return;
        setLoading(true);

        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({
                    identifier: form.identifier,
                    password: form.password,
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                setError(data?.error || "Thông tin đăng nhập không chính xác!");
                return;
            }

            const user = data.user;
            localStorage.setItem("user", JSON.stringify(user));

            if (user.role === "GOV") {
                router.push("/admin");
            } else {
                router.push("/voting");
            }
        } catch {
            setError("Không thể kết nối máy chủ.");
        } finally {
            setLoading(false);
        }
    };


    // ======================
    // UI
    // ======================
    return (
        <Box maxW="500px" mx="auto" mt={10}>
            <Heading textAlign="center" mb={6} fontSize="3xl" color="blue.600">
                Đăng nhập
            </Heading>


            <VStack spacing={4}>
                {/* IDENTIFIER */}
                <FormInput
                    placeholder="Nhập Hash CCCD hoặc Ví Blockchain"
                    value={form.identifier}
                    error={touched.identifier && !form.identifier}
                    isValid={isIdentifierValid}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        handleChange("identifier", e.target.value)
                    }
                    onBlur={() => handleBlur("identifier")}
                />


                {/* PASSWORD */}
                <PasswordInput
                    placeholder="Mật khẩu"
                    value={form.password}
                    error={touched.password && !form.password}
                    isValid={isPasswordValid}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        handleChange("password", e.target.value)
                    }
                    onBlur={() => handleBlur("password")}
                />


                {/* ERROR */}
                {error && (
                    <Text color="red.500" fontSize="sm">
                        {error}
                    </Text>
                )}


                {/* BUTTON */}
                <Button
                    w="100%"
                    colorScheme="blue"
                    onClick={handleLogin}
                    isDisabled={!isFormValid || loading}
                >
                    {loading ? "Đang đăng nhập..." : "Đăng nhập"}
                </Button>
            </VStack>
        </Box>
    );
}

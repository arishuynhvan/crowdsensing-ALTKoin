"use client";


import { Box, Text, Button, VStack, Heading } from "@chakra-ui/react";
import { useState } from "react";
import { useRouter } from "next/navigation";


// IMPORT COMPONENT
import FormInput from "@/components/formInput";
import PasswordInput from "@/components/passwordInput";


export default function RegisterPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");


    // ======================
    // FORM STATE
    // ======================
    const [form, setForm] = useState({
        name: "",
        cccd: "",
        phone: "",
        address: "",
        password: "",
        confirmPassword: "",
    });


    const [touched, setTouched] = useState({
        name: false,
        cccd: false,
        phone: false,
        address: false,
        password: false,
        confirmPassword: false,
    });


    // ======================
    // STEP 2 STATE
    // ======================
    const [deposit, setDeposit] = useState("");
    const [touchedDeposit, setTouchedDeposit] = useState(false);


    // ======================
    // HANDLERS
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
    const isValidCCCD = /^\d{12}$/.test(form.cccd);
    const isValidPhone = /^(0\d{9})$/.test(form.phone);


    const isStrongPassword =
        form.password.length >= 8 &&
        /[A-Z]/.test(form.password) &&
        /[a-z]/.test(form.password) &&
        /[0-9]/.test(form.password);


    const isFormValid =
        form.name &&
        isValidCCCD &&
        isValidPhone &&
        form.address &&
        form.password &&
        form.confirmPassword &&
        form.password === form.confirmPassword &&
        isStrongPassword;


    const depositValue = Number(deposit);
    const isValidDeposit = depositValue > 0;


    // ======================
    // STEP HANDLERS
    // ======================
    const [hashCCCD, setHashCCCD] = useState("");
    const [wallet, setWallet] = useState("");


    const handleStep1 = () => {
        if (!isFormValid) return;

        setError("");
        setStep(2);
    };


    const handleStep2 = async () => {
        if (!isValidDeposit) return;
        setError("");
        setLoading(true);

        try {
            const res = await fetch("/api/auth/register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    ...form,
                    deposit: depositValue,
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                setError(data?.error || "Đăng ký thất bại.");
                return;
            }

            setHashCCCD(data.user.identifier);
            setWallet(data.user.walletAddress);
            setStep(3);
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
        <Box maxW="600px" mx="auto" mt={10}>
            <Heading textAlign="center" mb={6} fontSize="3xl" color="blue.600">
                Đăng ký tạo tài khoản mới
            </Heading>


            {/* STEP 1 */}
            {step === 1 && (
                <VStack spacing={3}>
                    <FormInput
                        placeholder="Họ và tên"
                        value={form.name}
                        error={touched.name && !form.name}
                        isValid={!!form.name}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            handleChange("name", e.target.value)
                        }
                        onBlur={() => handleBlur("name")}
                    />


                    <FormInput
                        placeholder="Số CCCD"
                        value={form.cccd}
                        error={touched.cccd && (!form.cccd || !isValidCCCD)}
                        isValid={isValidCCCD}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            handleChange("cccd", e.target.value.replace(/\D/g, ""))
                        }
                        onBlur={() => handleBlur("cccd")}
                    />


                    {form.cccd && !isValidCCCD && (
                        <Text color="red.500" fontSize="sm">
                            CCCD phải gồm 12 chữ số!
                        </Text>
                    )}


                    <FormInput
                        placeholder="Số điện thoại"
                        value={form.phone}
                        error={touched.phone && (!form.phone || !isValidPhone)}
                        isValid={isValidPhone}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            handleChange("phone", e.target.value)
                        }
                        onBlur={() => handleBlur("phone")}
                    />


                    {form.phone && !isValidPhone && (
                        <Text color="red.500" fontSize="sm">
                            Số điện thoại không hợp lệ!
                        </Text>
                    )}


                    <FormInput
                        placeholder="Địa chỉ"
                        value={form.address}
                        error={touched.address && !form.address}
                        isValid={!!form.address}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            handleChange("address", e.target.value)
                        }
                        onBlur={() => handleBlur("address")}
                    />


                    <PasswordInput
                        placeholder="Mật khẩu"
                        value={form.password}
                        error={touched.password && !form.password}
                        isValid={isStrongPassword}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            handleChange("password", e.target.value)
                        }
                        onBlur={() => handleBlur("password")}
                    />


                    {!isStrongPassword && form.password && (
                        <Text color="red.500" fontSize="sm">
                            Mật khẩu phải ≥8 ký tự, có chữ hoa, chữ thường và số!
                        </Text>
                    )}


                    <PasswordInput
                        placeholder="Nhập lại mật khẩu"
                        value={form.confirmPassword}
                        error={touched.confirmPassword && !form.confirmPassword}
                        isValid={form.password === form.confirmPassword}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            handleChange("confirmPassword", e.target.value)
                        }
                        onBlur={() => handleBlur("confirmPassword")}
                    />


                    {form.confirmPassword && form.password !== form.confirmPassword && (
                        <Text color="red.500" fontSize="sm">
                            Mật khẩu không khớp!
                        </Text>
                    )}


                    <Button
                        w="100%"
                        colorScheme="blue"
                        onClick={handleStep1}
                        isDisabled={!isFormValid}
                    >
                        Xác nhận thông tin
                    </Button>
                </VStack>
            )}


            {/* STEP 2 */}
            {step === 2 && (
                <VStack spacing={3}>
                    <Text>Hệ thống sẽ tạo Hash CCCD + ví blockchain sau khi xác nhận ký quỹ.</Text>


                    <FormInput
                        placeholder="Nhập số tiền ký quỹ"
                        value={deposit}
                        error={touchedDeposit && (!deposit || !isValidDeposit)}
                        isValid={isValidDeposit}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setDeposit(e.target.value.replace(/\D/g, ""))
                        }
                        onBlur={() => setTouchedDeposit(true)}
                    />


                    {deposit && !isValidDeposit && (
                        <Text color="red.500" fontSize="sm">
                            Số tiền phải lớn hơn 0!
                        </Text>
                    )}

                    {error && (
                        <Text color="red.500" fontSize="sm">
                            {error}
                        </Text>
                    )}

                    <Button
                        w="100%"
                        colorScheme="orange"
                        onClick={handleStep2}
                        isDisabled={!isValidDeposit || loading}
                    >
                        {loading ? "Đang xử lý..." : "Xác nhận nộp phí ký quỹ"}
                    </Button>
                </VStack>
            )}


            {/* STEP 3 */}
            {step === 3 && (
                <VStack spacing={4} textAlign="center">
                    <Text fontSize="xl" color="green.500" fontWeight="bold">
                        🎉 Đăng ký thành công!
                    </Text>


                    <Text>Người dân có thể đăng nhập để sử dụng hệ thống!</Text>

                    <Text>
                        🔐 Hash CCCD: <b>{hashCCCD}</b>
                    </Text>

                    <Text>
                        💰 Ví Blockchain: <b>{wallet}</b>
                    </Text>


                    <Button
                        w="100%"
                        colorScheme="blue"
                        onClick={() => router.push("/login")}
                    >
                        Đăng nhập ngay!
                    </Button>
                </VStack>
            )}
        </Box>
    );
}

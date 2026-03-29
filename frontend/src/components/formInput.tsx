"use client";


import { Input, Text } from "@chakra-ui/react";


export default function FormInput({
    value,
    placeholder,
    error,
    isValid,
    onChange,
    onBlur,
}: any) {
    const getBorderColor = () => {
        if (error) return "red.500";
        if (value && isValid) return "green.500";
        return undefined;
    };


    return (
        <>
            <Input
                placeholder={placeholder}
                value={value}
                borderColor={getBorderColor()}
                onChange={onChange}
                onBlur={onBlur}
            />


            {error && (
                <Text color="red.500" fontSize="sm">
                    Đây là thông tin bắt buộc nhập, không được bỏ trống!
                </Text>
            )}
        </>
    );
}

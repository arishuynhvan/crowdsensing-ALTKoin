"use client";


import {
    Input,
    InputGroup,
    InputRightElement,
    IconButton,
} from "@chakra-ui/react";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { useState } from "react";


export default function PasswordInput({
    value,
    placeholder,
    error,
    isValid,
    onChange,
    onBlur,
}: any) {
    const [show, setShow] = useState(false);


    const getBorderColor = () => {
        if (error) return "red.500";
        if (value && isValid) return "green.500";
        return undefined;
    };


    return (
        <InputGroup>
            <Input
                type={show ? "text" : "password"}
                placeholder={placeholder}
                value={value}
                borderColor={getBorderColor()}
                onChange={onChange}
                onBlur={onBlur}
            />


            <InputRightElement>
                <IconButton
                    variant="ghost"
                    size="sm"
                    aria-label="toggle"
                    icon={show ? <FiEyeOff /> : <FiEye />}
                    onClick={() => setShow(!show)}
                />
            </InputRightElement>
        </InputGroup>
    );
}

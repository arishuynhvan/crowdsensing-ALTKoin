"use client";


import { VStack, Button, Image, HStack, Input, Text } from "@chakra-ui/react";
import { useRef, useState } from "react";


type Props = {
    cids: string[];
    onAdd: (url: string) => void;
    onDelete: (url: string) => void;
    locked: boolean;
};

function toPreviewUrl(value: string) {
    if (value.startsWith("http://") || value.startsWith("https://")) return value;
    if (value.startsWith("ipfs://")) {
        const cid = value.replace("ipfs://", "");
        return `https://gateway.pinata.cloud/ipfs/${cid}`;
    }
    return `https://gateway.pinata.cloud/ipfs/${value}`;
}

export default function ImageUploader({ cids, onAdd, onDelete, locked }: Props) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState("");

    const handleUploadClick = () => {
        inputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setUploading(true);
        setError("");

        try {
            const form = new FormData();
            form.append("file", file);

            const res = await fetch("/api/upload", {
                method: "POST",
                body: form,
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data?.error || "Upload IPFS thất bại.");
            }

            onAdd(data.url);
        } catch (err) {
            const message = err instanceof Error ? err.message : "Upload IPFS thất bại.";
            setError(message);
        } finally {
            setUploading(false);
            event.target.value = "";
        }
    };


    return (
        <VStack align="stretch">
            <Input
                ref={inputRef}
                type="file"
                accept="image/*"
                display="none"
                onChange={handleFileChange}
            />

            <Button onClick={handleUploadClick} isLoading={uploading}>
                📸 Tải hình ảnh minh chứng (IPFS)
            </Button>

            {error && <Text color="red.500">{error}</Text>}

            {cids.map((url) => (
                <HStack key={url}>
                    <Image
                        src={toPreviewUrl(url)}
                        alt="evidence"
                        boxSize="100px"
                    />


                    {!locked && (
                        <Button size="sm" colorScheme="red" onClick={() => onDelete(url)}>
                            Xóa hình ảnh minh chứng
                        </Button>
                    )}
                </HStack>
            ))}
        </VStack>
    );
}

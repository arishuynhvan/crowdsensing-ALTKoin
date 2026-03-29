"use client";


import { VStack, Button, Image, HStack } from "@chakra-ui/react";


export default function ImageUploader({ cids, onAdd, onDelete, locked }: any) {
    // MOCK upload IPFS
    const handleUpload = async () => {
        const fakeCID = "CID_" + Math.random().toString(36).substring(7);
        onAdd(fakeCID);
    };


    return (
        <VStack align="stretch">
            <Button onClick={handleUpload}>
                📸 Tải hình ảnh minh chứng (IPFS mock)
            </Button>


            {cids.map((cid: string) => (
                <HStack key={cid}>
                    <Image
                        src={`https://ipfs.io/ipfs/${cid}`}
                        alt="evidence"
                        boxSize="100px"
                    />


                    {!locked && (
                        <Button size="sm" colorScheme="red" onClick={() => onDelete(cid)}>
                            Xóa hình ảnh minh chứng
                        </Button>
                    )}
                </HStack>
            ))}
        </VStack>
    );
}

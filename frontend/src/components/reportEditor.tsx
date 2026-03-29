"use client";


import {
    VStack,
    Textarea,
    Button,
    Text,
    HStack,
    useDisclosure,
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
} from "@chakra-ui/react";


import {
    getDrafts,
    saveDrafts,
    saveLocalReports,
    getLocalReports,
} from "@/lib/reportStore";
import { useState } from "react";
import ImageUploader from "./imageUpload";
import { submitReport } from "@/lib/api";


type Draft = {
    id?: number;
    content: string;
    cids: string[];
    submitted: boolean;
};


export default function ReportEditor({
    initialData,
    onSaveDraft,
    onSubmitSuccess,
}: any) {
    const [draft, setDraft] = useState<Draft>(
        initialData || { content: "", cids: [], submitted: false },
    );


    const [loading, setLoading] = useState(false);
    const [touched, setTouched] = useState(false);


    const { isOpen, onOpen, onClose } = useDisclosure();


    const isValid = draft.content.trim().length > 0;


    // ======================
    // EDIT/ UPDATE DRAFT (OFFCHAIN)
    // ======================
    const updateContent = (value: string) => {
        setDraft((prev) => ({ ...prev, content: value }));
    };


    const addImage = (cid: string) => {
        setDraft((prev) => ({
            ...prev,
            cids: [...prev.cids, cid],
        }));
    };


    const deleteImage = (cid: string) => {
        if (draft.submitted) return;


        setDraft((prev) => ({
            ...prev,
            cids: prev.cids.filter((c) => c !== cid),
        }));
    };


    // ======================
    // SAVE DRAFT (OFFCHAIN)
    // ======================
    const handleSaveDraft = () => {
        const drafts = getDrafts();


        const newDraft = {
            ...draft,
            id: draft.id ?? Date.now(),
        };


        const updated = drafts.some((d) => d.id === newDraft.id)
            ? drafts.map((d) => (d.id === newDraft.id ? newDraft : d))
            : [...drafts, newDraft];


        saveDrafts(updated);


        alert(
            "💾 Đã lưu Báo cáo vi phạm dưới dạng Nháp, có thể truy cập chỉnh sửa Nháp bất cứ lúc nào!",
        );
    };


    // ======================
    // SUBMIT (ONCHAIN)
    // ======================
    const handleSubmit = async () => {
        setTouched(true);
        if (!isValid) return;


        try {
            setLoading(true);


            await submitReport({
                content: draft.content,
                cids: draft.cids,
            });


            const newReport = {
                id: Date.now(),
                content: draft.content,
                cids: draft.cids,
                score: 0,
                timestamp: Date.now(),
            };


            const reports = getLocalReports();
            saveLocalReports([newReport, ...reports]);


            setDraft((prev) => ({ ...prev, submitted: true }));


            alert(
                "✅ Đã gửi Báo cáo vi phạm thành công – chỉ được sửa nội dung sự việc vi pham và thêm hình ảnh minh chứng mới!",
            );
            onClose();
        } catch (err) {
            console.error(err);
            alert("❌ Lỗi khi gửi Báo cáo vi phạm! Vui lòng thử lại sau!");
        } finally {
            setLoading(false);
        }
    };


    return (
        <VStack spacing={4} align="stretch">
            <Textarea
                placeholder="Nhập nội dung sự việc vi phạm..."
                value={draft.content}
                onChange={(e) => updateContent(e.target.value)}
                onBlur={() => setTouched(true)}
            />


            {!isValid && touched && (
                <Text color="red.500">
                    Không được để trống nội dung sự việc vi phạm!
                </Text>
            )}


            <ImageUploader
                cids={draft.cids}
                onAdd={addImage}
                onDelete={deleteImage}
                locked={draft.submitted}
            />


            <HStack>
                {!draft.submitted && (
                    <>
                        <Button onClick={handleSaveDraft} colorScheme="gray">
                            💾 Lưu thành Nháp
                        </Button>


                        <Button colorScheme="blue" onClick={onOpen} isDisabled={!isValid}>
                            🚀 Xác nhận gửi Báo cáo vi phạm
                        </Button>
                    </>
                )}
            </HStack>


            {draft.submitted && (
                <Text color="green.500">
                    ✅ Đã gửi Báo cáo vi phạm thành công – chỉ được sửa nội dung sự việc
                    vi pham và thêm hình ảnh minh chứng mới!
                </Text>
            )}
        </VStack>
    );
}

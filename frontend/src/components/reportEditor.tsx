"use client";

import { VStack, Textarea, Button, Text, HStack } from "@chakra-ui/react";
import { useState } from "react";
import { getDrafts, saveDrafts } from "@/lib/reportStore";
import ImageUploader from "./imageUpload";
import { submitReport } from "@/lib/api";

type Draft = {
  id?: number;
  content: string;
  cids: string[];
  submitted: boolean;
};

type ReportEditorProps = {
  initialData?: Draft | null;
  onSaveDraft?: (draft: Draft) => void;
  onSubmitSuccess?: (report: {
    id: number;
    content: string;
    cids: string[];
    score: number;
    timestamp: number;
  }) => void;
};

export default function ReportEditor({
  initialData,
  onSaveDraft,
  onSubmitSuccess,
}: ReportEditorProps) {
  const [draft, setDraft] = useState<Draft>(
    initialData ?? { content: "", cids: [], submitted: false }
  );
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState(false);

  const isValid = draft.content.trim().length > 0;

  const updateContent = (value: string) => {
    setDraft((prev) => ({ ...prev, content: value }));
  };

  const addImage = (cid: string) => {
    setDraft((prev) => ({ ...prev, cids: [...prev.cids, cid] }));
  };

  const deleteImage = (cid: string) => {
    if (draft.submitted) return;
    setDraft((prev) => ({ ...prev, cids: prev.cids.filter((c) => c !== cid) }));
  };

  const handleSaveDraft = () => {
    const drafts = getDrafts();
    const newDraft: Draft = {
      ...draft,
      id: draft.id ?? Date.now(),
    };

    const updated = drafts.some((d) => d.id === newDraft.id)
      ? drafts.map((d) => (d.id === newDraft.id ? newDraft : d))
      : [...drafts, newDraft];

    saveDrafts(updated);
    onSaveDraft?.(newDraft);

    alert("💾 Đã lưu Báo cáo vi phạm dưới dạng Nháp.");
  };

  const handleSubmit = async () => {
    setTouched(true);
    if (!isValid) return;

    try {
      setLoading(true);

      const user =
        typeof window !== "undefined"
          ? JSON.parse(localStorage.getItem("user") || "{}")
          : null;
      const report = await submitReport({
        content: draft.content,
        cids: draft.cids,
        location: "Unknown",
        reporter: user?.walletAddress ?? null,
      });

      setDraft((prev) => ({ ...prev, submitted: true }));
      onSubmitSuccess?.({
        id: report.id,
        content: report.content,
        cids: report.cids,
        score: report.score,
        timestamp: report.timestamp,
      });

      alert("✅ Đã gửi Báo cáo vi phạm thành công!");
    } catch (err) {
      console.error(err);
      alert("❌ Lỗi khi gửi Báo cáo vi phạm. Vui lòng thử lại.");
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
        <Text color="red.500">Không được để trống nội dung sự việc vi phạm.</Text>
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
            <Button
              colorScheme="blue"
              onClick={handleSubmit}
              isDisabled={!isValid || loading}
            >
              {loading ? "Đang gửi..." : "🚀 Xác nhận gửi Báo cáo vi phạm"}
            </Button>
          </>
        )}
      </HStack>

      {draft.submitted && (
        <Text color="green.500">
          ✅ Đã gửi Báo cáo vi phạm thành công. Bạn có thể qua trang Voting để xem
          cập nhật điểm.
        </Text>
      )}
    </VStack>
  );
}

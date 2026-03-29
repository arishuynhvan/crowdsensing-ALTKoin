"use client";

import { VStack, Textarea, Button, Text, HStack, Input, Box } from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";
import { getDrafts, saveDrafts } from "@/lib/reportStore";
import ImageUploader from "./imageUpload";
import { submitReport } from "@/lib/api";

type Draft = {
  id?: number;
  content: string;
  cids: string[];
  location: string;
  latitude: number | null;
  longitude: number | null;
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
    initialData ?? {
      content: "",
      cids: [],
      location: "",
      latitude: null,
      longitude: null,
      submitted: false,
    }
  );
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [touched, setTouched] = useState(false);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);

  const MAP_ZOOM = 15;
  const MAP_HEIGHT = 220;

  const isValid = draft.content.trim().length > 0;
  const hasLocation =
    draft.location.trim().length > 0 &&
    typeof draft.latitude === "number" &&
    typeof draft.longitude === "number";

  const normalizeLatLng = (lat: number, lng: number) => ({
    lat: Number(lat.toFixed(6)),
    lng: Number(lng.toFixed(6)),
  });

  const mapSrcDoc = useMemo(() => {
    if (!hasLocation) return "";
    const centerLat = mapCenter?.lat ?? draft.latitude ?? 0;
    const centerLng = mapCenter?.lng ?? draft.longitude ?? 0;
    const markerLat = draft.latitude ?? centerLat;
    const markerLng = draft.longitude ?? centerLng;

    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link
      rel="stylesheet"
      href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
      crossorigin=""
    />
    <style>
      html, body, #map { height: 100%; margin: 0; }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
      integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
      crossorigin=""></script>
    <script>
      const map = L.map('map').setView([${centerLat}, ${centerLng}], ${MAP_ZOOM});
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      const marker = L.marker([${markerLat}, ${markerLng}], { draggable: true }).addTo(map);

      function send(lat, lng) {
        window.parent.postMessage({ type: 'report-map-location', lat, lng }, '*');
      }

      marker.on('dragend', function() {
        const p = marker.getLatLng();
        send(p.lat, p.lng);
      });

      map.on('click', function(e) {
        marker.setLatLng(e.latlng);
        send(e.latlng.lat, e.latlng.lng);
      });
    </script>
  </body>
</html>`;
  }, [MAP_ZOOM, draft.latitude, draft.longitude, hasLocation, mapCenter]);

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

  const setLocationByBrowser = () => {
    if (!navigator.geolocation) {
      setLocationError("Trình duyệt không hỗ trợ định vị.");
      return;
    }

    setLocating(true);
    setLocationError("");

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        setDraft((prev) => ({
          ...prev,
          latitude: lat,
          longitude: lng,
          location: prev.location.trim() || `${lat}, ${lng}`,
        }));
        setMapCenter({ lat, lng });
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        setLocationError(err.message || "Không lấy được vị trí.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; lat?: number; lng?: number } | undefined;
      if (data?.type !== "report-map-location") return;
      if (typeof data.lat !== "number" || typeof data.lng !== "number") return;

      const { lat, lng } = normalizeLatLng(data.lat, data.lng);
      setDraft((prev) => ({
        ...prev,
        latitude: lat,
        longitude: lng,
        location: prev.location.trim() || `${lat}, ${lng}`,
      }));
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

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
        location: draft.location,
        latitude: draft.latitude!,
        longitude: draft.longitude!,
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

      <Input
        placeholder="Địa điểm (bắt buộc)"
        value={draft.location}
        onChange={(e) =>
          setDraft((prev) => ({
            ...prev,
            location: e.target.value,
          }))
        }
        onBlur={() => setTouched(true)}
      />

      <HStack align="start">
        <Input
          placeholder="Latitude"
          value={draft.latitude ?? ""}
          onChange={(e) =>
            setDraft((prev) => {
              const next = e.target.value === "" ? null : Number(e.target.value);
              if (typeof next === "number" && typeof prev.longitude === "number" && !mapCenter) {
                setMapCenter({ lat: next, lng: prev.longitude });
              }
              return {
                ...prev,
                latitude: next,
              };
            })
          }
        />
        <Input
          placeholder="Longitude"
          value={draft.longitude ?? ""}
          onChange={(e) =>
            setDraft((prev) => {
              const next = e.target.value === "" ? null : Number(e.target.value);
              if (typeof next === "number" && typeof prev.latitude === "number" && !mapCenter) {
                setMapCenter({ lat: prev.latitude, lng: next });
              }
              return {
                ...prev,
                longitude: next,
              };
            })
          }
        />
        <Button onClick={setLocationByBrowser} isLoading={locating}>
          Lấy vị trí
        </Button>
        <Button
          onClick={() => {
            if (typeof draft.latitude === "number" && typeof draft.longitude === "number") {
              setMapCenter({ lat: draft.latitude, lng: draft.longitude });
            }
          }}
        >
          Căn giữa pin
        </Button>
      </HStack>

      {locationError && <Text color="red.500">{locationError}</Text>}
      {!hasLocation && touched && (
        <Text color="red.500">Vui lòng nhập địa điểm và lat/lng trước khi gửi.</Text>
      )}

      {hasLocation && (
        <Box borderWidth="1px" borderRadius="md" overflow="hidden">
          <iframe
            key={`${draft.latitude}-${draft.longitude}-${mapCenter?.lat ?? ""}-${mapCenter?.lng ?? ""}`}
            title="Report location map"
            width="100%"
            height={MAP_HEIGHT}
            style={{ border: "0" }}
            srcDoc={mapSrcDoc}
          />
          <Text fontSize="xs" color="gray.500" px={2} py={1}>
            Kéo ghim hoặc click vào bản đồ để chỉnh vị trí chính xác.
          </Text>
        </Box>
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
              isDisabled={!isValid || !hasLocation || loading}
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

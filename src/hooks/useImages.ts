import { useCallback, useRef, useState } from "react";
import { api } from "../api";
import { mock } from "../mock";
import type { AvailableDate, Camera, CapturedImage, ImageSummary, LatestImage, Pagination } from "../types";

const thumbnailPageSize = 100;
const maxLatestImageCount = 9;
const emptyPagination: Pagination = {
  page: 1,
  page_size: thumbnailPageSize,
  total_count: 0,
  total_pages: 1
};
const emptyImageSummary: ImageSummary = {
  image_count: 0,
  total_file_size_bytes: 0
};

const summarizeImages = (images: CapturedImage[], imageCount = images.length): ImageSummary => ({
  image_count: imageCount,
  total_file_size_bytes: images.reduce((total, image) => total + (image.file_size_bytes ?? 0), 0)
});

const emptyLatestImage = (cameraId: string): LatestImage => ({
  camera_id: cameraId,
  camera_name: cameraId,
  latest_status: "not_yet",
  latest_image_id: null,
  latest_captured_at: null,
  latest_image_url: null,
  latest_thumbnail_url: null,
  latest_error: null
});

export function useImages({
  useMock,
  withLoading,
  contextCompanyId,
  contextSiteId,
  selectedCamera,
  initialSelectedDate
}: {
  useMock: boolean;
  withLoading: (task: () => Promise<void>) => Promise<void>;
  contextCompanyId?: string | null;
  contextSiteId?: string | null;
  selectedCamera: Camera | null;
  initialSelectedDate: string;
}) {
  const [availableDates, setAvailableDates] = useState<AvailableDate[]>([]);
  const [selectedDate, setSelectedDate] = useState(initialSelectedDate);
  const [images, setImages] = useState<CapturedImage[]>([]);
  const [imageSummary, setImageSummary] = useState<ImageSummary>(emptyImageSummary);
  const [thumbnailPagination, setThumbnailPagination] = useState<Pagination>(emptyPagination);
  const [latestImages, setLatestImages] = useState<LatestImage[]>([]);
  const lastLoadedCameraId = useRef<string | null>(null);

  const loadThumbnails = useCallback(
    async (cameraId: string, date: string, page = 1) => {
      if (useMock) {
        const mockImages = mock.thumbnails(cameraId);
        const start = (page - 1) * thumbnailPageSize;
        setImages(mockImages.slice(start, start + thumbnailPageSize));
        setImageSummary(summarizeImages(mockImages));
        setThumbnailPagination({
          page,
          page_size: thumbnailPageSize,
          total_count: mockImages.length,
          total_pages: Math.max(1, Math.ceil(mockImages.length / thumbnailPageSize))
        });
        return;
      }

      const data = await api.thumbnails(cameraId, date, page, thumbnailPageSize);
      setImages(data.images);
      setImageSummary(data.summary ?? summarizeImages(data.images, data.pagination.total_count));
      setThumbnailPagination(data.pagination);
    },
    [useMock]
  );

  const loadDatesAndImages = useCallback(
    (camera: Camera | null) =>
      withLoading(async () => {
        if (!camera) {
          setAvailableDates([]);
          setSelectedDate("");
          setImages([]);
          setImageSummary(emptyImageSummary);
          setThumbnailPagination(emptyPagination);
          lastLoadedCameraId.current = null;
          return;
        }
        const isNewCamera = lastLoadedCameraId.current !== camera.camera_id;
        const dates = useMock ? mock.availableDates() : await api.availableDates(contextCompanyId, contextSiteId, camera.camera_id);
        setAvailableDates(dates.available_dates);
        const latestDate = dates.default_date || dates.available_dates[0]?.date || "";
        const nextDate = isNewCamera ? latestDate : selectedDate || latestDate;
        lastLoadedCameraId.current = camera.camera_id;
        setSelectedDate(nextDate);
        if (nextDate) await loadThumbnails(camera.camera_id, nextDate, 1);
        else {
          setImages([]);
          setImageSummary(emptyImageSummary);
          setThumbnailPagination(emptyPagination);
        }
      }),
    [contextCompanyId, contextSiteId, loadThumbnails, selectedDate, useMock, withLoading]
  );

  const changeDate = useCallback(
    async (date: string) => {
      setSelectedDate(date);
      if (selectedCamera) await loadThumbnails(selectedCamera.camera_id, date, 1);
    },
    [loadThumbnails, selectedCamera]
  );

  const changeThumbnailPage = useCallback(
    async (page: number) => {
      if (!selectedCamera || !selectedDate) return;
      await loadThumbnails(selectedCamera.camera_id, selectedDate, page);
    },
    [loadThumbnails, selectedCamera, selectedDate]
  );

  const refreshLatestImages = useCallback(
    async (cameraIds: string[]) => {
      const displayCameraIds = cameraIds.slice(0, maxLatestImageCount);
      if (useMock) {
        setLatestImages(mock.latestBulk(displayCameraIds).cameras);
        return;
      }

      const currentLatest = await api.latestBulk(displayCameraIds);
      const currentLatestByCameraId = new Map(currentLatest.cameras.map((item) => [item.camera_id, item]));
      const latestAcrossDates = await Promise.all(
        displayCameraIds.map(async (cameraId) => {
          const fallback = currentLatestByCameraId.get(cameraId) ?? emptyLatestImage(cameraId);
          try {
            const dates = await api.availableDates(contextCompanyId, contextSiteId, cameraId);
            const latestDate = dates.default_date || dates.available_dates[0]?.date || "";
            if (!latestDate) return fallback;

            const latestDayImages = await api.thumbnails(cameraId, latestDate, 1, 1);
            const latestImage = latestDayImages.images[0];
            if (!latestImage) return fallback;

            return {
              camera_id: cameraId,
              camera_name: latestDayImages.camera.camera_name || latestImage.camera_name || fallback.camera_name,
              latest_status: "success" as const,
              latest_image_id: latestImage.image_id,
              latest_captured_at: latestImage.captured_at,
              latest_image_url: latestImage.image_url,
              latest_thumbnail_url: latestImage.thumbnail_url,
              latest_error: null
            };
          } catch {
            return fallback;
          }
        })
      );
      setLatestImages(latestAcrossDates);
    },
    [contextCompanyId, contextSiteId, useMock]
  );

  return {
    availableDates,
    selectedDate,
    setSelectedDate,
    images,
    imageSummary,
    thumbnailPagination,
    latestImages,
    setLatestImages,
    loadDatesAndImages,
    changeDate,
    changeThumbnailPage,
    refreshLatestImages
  };
}

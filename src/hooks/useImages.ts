import { useCallback, useRef, useState } from "react";
import { api } from "../api";
import { mock } from "../mock";
import type { AvailableDate, Camera, CapturedImage, LatestImage, Pagination } from "../types";

const thumbnailPageSize = 100;
const emptyPagination: Pagination = {
  page: 1,
  page_size: thumbnailPageSize,
  total_count: 0,
  total_pages: 1
};

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
  const [thumbnailPagination, setThumbnailPagination] = useState<Pagination>(emptyPagination);
  const [latestImages, setLatestImages] = useState<LatestImage[]>([]);
  const lastLoadedCameraId = useRef<string | null>(null);

  const loadThumbnails = useCallback(
    async (cameraId: string, date: string, page = 1) => {
      if (useMock) {
        const mockImages = mock.thumbnails(cameraId);
        const start = (page - 1) * thumbnailPageSize;
        setImages(mockImages.slice(start, start + thumbnailPageSize));
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
      setLatestImages(useMock ? mock.latestBulk(cameraIds).cameras : (await api.latestBulk(cameraIds)).cameras);
    },
    [useMock]
  );

  return {
    availableDates,
    selectedDate,
    setSelectedDate,
    images,
    thumbnailPagination,
    latestImages,
    setLatestImages,
    loadDatesAndImages,
    changeDate,
    changeThumbnailPage,
    refreshLatestImages
  };
}

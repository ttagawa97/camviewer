import { useCallback, useState } from "react";
import { api } from "../api";
import { mock } from "../mock";
import type { AvailableDate, Camera, CapturedImage, LatestImage } from "../types";

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
  const [latestImages, setLatestImages] = useState<LatestImage[]>([]);

  const loadDatesAndImages = useCallback(
    (camera: Camera | null) =>
      withLoading(async () => {
        if (!camera) {
          setAvailableDates([]);
          setSelectedDate("");
          setImages([]);
          return;
        }
        const dates = useMock ? mock.availableDates() : await api.availableDates(contextCompanyId, contextSiteId, camera.camera_id);
        setAvailableDates(dates.available_dates);
        const nextDate = selectedDate || dates.default_date || dates.available_dates[0]?.date || "";
        setSelectedDate(nextDate);
        setImages(nextDate ? (useMock ? mock.thumbnails(camera.camera_id) : await api.thumbnails(camera.camera_id, nextDate)) : []);
      }),
    [contextCompanyId, contextSiteId, selectedDate, useMock, withLoading]
  );

  const changeDate = useCallback(
    async (date: string) => {
      setSelectedDate(date);
      if (selectedCamera) setImages(useMock ? mock.thumbnails(selectedCamera.camera_id) : await api.thumbnails(selectedCamera.camera_id, date));
    },
    [selectedCamera, useMock]
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
    latestImages,
    setLatestImages,
    loadDatesAndImages,
    changeDate,
    refreshLatestImages
  };
}

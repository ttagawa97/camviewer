import { Dispatch, SetStateAction, useCallback, useState } from "react";
import { api } from "../api";
import { mock } from "../mock";
import type { Camera, CameraFormValues } from "../types";

export function useCameras({
  useMock,
  withLoading,
  showToast,
  contextCompanyId,
  contextSiteId,
  editingCameraId,
  setSelectedCamera,
  onSaved
}: {
  useMock: boolean;
  withLoading: (task: () => Promise<void>) => Promise<void>;
  showToast: (message: string) => void;
  contextCompanyId?: string | null;
  contextSiteId?: string | null;
  editingCameraId: string | null;
  setSelectedCamera: Dispatch<SetStateAction<Camera | null>>;
  onSaved: () => void;
}) {
  const [cameras, setCameras] = useState<Camera[]>([]);

  const loadCameras = useCallback(
    (keyword = "") =>
      withLoading(async () => {
        const rows = useMock ? mock.cameras(contextCompanyId, contextSiteId, keyword) : await api.cameras(contextCompanyId, contextSiteId, keyword);
        setCameras(rows);
        setSelectedCamera((current) => current ?? rows[0] ?? null);
      }),
    [contextCompanyId, contextSiteId, setSelectedCamera, useMock, withLoading]
  );

  const saveCamera = useCallback(
    async (values: CameraFormValues) => {
      await withLoading(async () => {
        if (!useMock) {
          if (editingCameraId) await api.updateCamera(editingCameraId, values);
          else await api.createCamera(values, contextCompanyId, contextSiteId);
        }
        showToast(editingCameraId ? "カメラ設定を保存しました" : "カメラを登録しました");
        onSaved();
        await loadCameras();
      });
    },
    [contextCompanyId, contextSiteId, editingCameraId, loadCameras, onSaved, showToast, useMock, withLoading]
  );

  const deleteCamera = useCallback(
    async (cameraId: string) => {
      if (!window.confirm("選択したカメラを削除します。よろしいですか？")) return;
      await withLoading(async () => {
        if (!useMock) await api.deleteCamera(cameraId);
        showToast("カメラを削除しました");
        await loadCameras();
      });
    },
    [loadCameras, showToast, useMock, withLoading]
  );

  const deleteCameraImages = useCallback(
    async (camera: Camera) => {
      if (!window.confirm(`${camera.camera_name} の保存済み画像をすべて削除します。\nカメラ設定は削除されません。この操作は元に戻せません。よろしいですか？`)) return;
      await withLoading(async () => {
        if (!useMock) await api.deleteCameraImages(camera.camera_id);
        showToast("カメラの保存済み画像を削除しました");
        await loadCameras();
      });
    },
    [loadCameras, showToast, useMock, withLoading]
  );

  const testSavedCamera = useCallback(
    async (camera: Camera) => {
      await withLoading(async () => {
        if (!useMock) await api.testSavedCamera(camera.camera_id);
        showToast("接続テストに成功しました");
      });
    },
    [showToast, useMock, withLoading]
  );

  const testCameraValues = useCallback(
    async (values: CameraFormValues) => {
      await withLoading(async () => {
        if (!useMock) await api.testConnection(values, contextCompanyId, contextSiteId);
        showToast("接続テストに成功しました");
      });
    },
    [contextCompanyId, contextSiteId, showToast, useMock, withLoading]
  );

  return { cameras, setCameras, loadCameras, saveCamera, deleteCamera, deleteCameraImages, testSavedCamera, testCameraValues };
}

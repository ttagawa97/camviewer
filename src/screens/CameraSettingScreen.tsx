import { qualityLabels } from "../constants";
import type { Camera } from "../types";
import { formatDateTime, statusLabel } from "../utils/format";

export function CameraSettingScreen({
  cameras,
  onAdd,
  onEdit,
  onDelete,
  onDeleteImages,
  onTest,
  onBack
}: {
  cameras: Camera[];
  onAdd: () => void;
  onEdit: (camera: Camera) => void;
  onDelete: (cameraId: string) => void;
  onDeleteImages: (camera: Camera) => void;
  onTest: (camera: Camera) => void;
  onBack: () => void;
}) {
  return (
    <section className="content-panel">
      <div className="toolbar">
        <h2>カメラ一覧</h2>
        <button className="primary" onClick={onAdd}>カメラ追加</button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>カメラ名</th>
              <th>アドレス</th>
              <th>認証方式</th>
              <th>取得間隔</th>
              <th>保存画質</th>
              <th>保存期間</th>
              <th>取得状態</th>
              <th>最終取得日時</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {cameras.map((camera) => (
              <tr key={camera.camera_id} onDoubleClick={() => onEdit(camera)}>
                <td>{camera.camera_name}</td>
                <td>{camera.address ?? "-"}</td>
                <td>BASIC</td>
                <td>{camera.capture_interval_minutes}分</td>
                <td>{qualityLabels[camera.image_quality]}</td>
                <td>{camera.retention_days ?? "-"}日</td>
                <td><span className={`status ${camera.last_capture_status ?? "not_yet"}`}>{statusLabel(camera.last_capture_status)}</span></td>
                <td>{formatDateTime(camera.last_capture_at)}</td>
                <td className="row-actions">
                  <button onClick={(event) => { event.stopPropagation(); onEdit(camera); }}>編集</button>
                  <button onClick={(event) => { event.stopPropagation(); onDelete(camera.camera_id); }}>削除</button>
                  <button onClick={(event) => { event.stopPropagation(); onDeleteImages(camera); }}>画像削除</button>
                  <button onClick={(event) => { event.stopPropagation(); onTest(camera); }}>接続テスト</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {cameras.length === 0 && <div className="empty-state">登録済みカメラがありません</div>}
      </div>
      <div className="footer-actions">
        <button className="ghost" onClick={onBack}>戻る</button>
      </div>
    </section>
  );
}

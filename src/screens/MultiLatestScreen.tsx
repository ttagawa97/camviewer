import type { CSSProperties } from "react";
import type { LatestImage } from "../types";
import { formatDateTime, statusLabel } from "../utils/format";

export function MultiLatestScreen({
  latestImages,
  displayCameraCount,
  onBack,
  onRefresh,
  onOpenImage
}: {
  latestImages: LatestImage[];
  displayCameraCount: number;
  onBack: () => void;
  onRefresh: () => void;
  onOpenImage: (image: LatestImage) => void;
}) {
  const visibleImages = latestImages.slice(0, 9);
  const slotCount = getLatestSlotCount(displayCameraCount);
  const blankSlotCount = Math.max(0, slotCount - visibleImages.length);
  const gridStyle: CSSProperties & Record<"--latest-grid-columns" | "--latest-grid-rows", number> = {
    "--latest-grid-columns": getLatestGridColumns(slotCount),
    "--latest-grid-rows": getLatestGridRows(slotCount)
  };

  return (
    <section className="content-panel multi-latest-panel">
      <div className="toolbar">
        <div>
          <h2>最新画像一覧</h2>
          <p>最終画面更新日時: {formatDateTime(new Date().toISOString())}</p>
        </div>
        <button onClick={onRefresh}>更新</button>
      </div>
      <div className="latest-grid" style={gridStyle}>
        {visibleImages.map((item) => (
          <article className="latest-frame" key={item.camera_id}>
            <div className="card-title">
              <h3>{item.camera_name}</h3>
              <span className={`status ${item.latest_status}`}>{statusLabel(item.latest_status)}</span>
            </div>
            {item.latest_image_url ? (
              <button className="latest-image-button" onDoubleClick={() => onOpenImage(item)}>
                <img src={item.latest_image_url} alt={item.camera_name} />
              </button>
            ) : (
              <div className="image-placeholder">{item.latest_status === "failed" ? item.latest_error ?? "取得失敗" : "未取得"}</div>
            )}
            <p>{formatDateTime(item.latest_captured_at)}</p>
          </article>
        ))}
        {Array.from({ length: blankSlotCount }).map((_, index) => (
          <div className="latest-frame blank" key={`blank-${index}`} aria-hidden="true" />
        ))}
      </div>
      {displayCameraCount === 0 && <div className="empty-state">表示対象のカメラが選択されていません</div>}
      <div className="footer-actions">
        <button className="ghost" onClick={onBack}>戻る</button>
      </div>
    </section>
  );
}

function getLatestSlotCount(count: number) {
  if (count <= 0) return 0;
  if (count <= 2) return 2;
  if (count <= 4) return 4;
  if (count <= 6) return 6;
  if (count <= 8) return 8;
  return 9;
}

function getLatestGridColumns(slotCount: number) {
  if (slotCount === 6) return 3;
  if (slotCount === 8) return 4;
  if (slotCount === 9) return 3;
  return 2;
}

function getLatestGridRows(slotCount: number) {
  if (slotCount === 2) return 1;
  if (slotCount === 9) return 3;
  return 2;
}

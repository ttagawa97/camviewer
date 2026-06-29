import type { LatestImage } from "../types";
import { formatDateTime, statusLabel } from "../utils/format";

export function MultiLatestScreen({
  latestImages,
  onBack,
  onRefresh,
  onOpenImage
}: {
  latestImages: LatestImage[];
  onBack: () => void;
  onRefresh: () => void;
  onOpenImage: (image: LatestImage) => void;
}) {
  return (
    <section className="content-panel">
      <div className="toolbar">
        <div>
          <h2>最新画像カード一覧</h2>
          <p>最終画面更新日時: {formatDateTime(new Date().toISOString())}</p>
        </div>
        <button onClick={onRefresh}>更新</button>
      </div>
      <div className="latest-grid">
        {latestImages.map((item) => (
          <article className="latest-card" key={item.camera_id}>
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
      </div>
      {latestImages.length === 0 && <div className="empty-state">表示対象のカメラが選択されていません</div>}
      <div className="footer-actions">
        <button className="ghost" onClick={onBack}>戻る</button>
      </div>
    </section>
  );
}

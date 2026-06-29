import type { CapturedImage, LatestImage } from "../types";
import { formatDateTime } from "../utils/format";

export function ImageModal({ image, onClose }: { image: CapturedImage | LatestImage; onClose: () => void }) {
  const imageUrl = "image_url" in image ? image.image_url : image.latest_image_url;
  const cameraName = "camera_name" in image ? image.camera_name : image.camera_name;
  const capturedAt = "captured_at" in image ? image.captured_at : image.latest_captured_at;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="image-modal">
        <div className="toolbar">
          <div>
            <h2>{cameraName}</h2>
            <p>{formatDateTime(capturedAt)}</p>
          </div>
          <button className="ghost" onClick={onClose}>閉じる</button>
        </div>
        {imageUrl ? <img src={imageUrl} alt={cameraName} /> : <div className="image-placeholder">画像を読み込めませんでした</div>}
      </div>
    </div>
  );
}

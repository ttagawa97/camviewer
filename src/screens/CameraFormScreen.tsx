import { FormEvent, useState } from "react";
import { emptyCameraForm, qualityLabels, qualityOptions } from "../constants";
import type { Camera, CameraFormValues, ImageQuality } from "../types";

export function CameraFormScreen({
  camera,
  onSave,
  onCancel,
  onTest
}: {
  camera: Camera | null;
  onSave: (values: CameraFormValues) => void;
  onCancel: () => void;
  onTest: (values: CameraFormValues) => void;
}) {
  const [values, setValues] = useState<CameraFormValues>({
    ...emptyCameraForm,
    camera_name: camera?.camera_name ?? "",
    address: camera?.address ?? "",
    login_id: camera?.login_id ?? "",
    capture_interval_minutes: camera?.capture_interval_minutes ?? 1,
    image_quality: camera?.image_quality ?? "FullHD",
    retention_days: camera?.retention_days ?? 30,
    ai_text: camera?.ai_text ?? ""
  });
  const [formError, setFormError] = useState("");

  const update = (key: keyof CameraFormValues, value: string | number) => setValues((current) => ({ ...current, [key]: value }));

  const validate = () => {
    if (!values.camera_name.trim()) return "カメラ名は必須です";
    if (!/^https?:\/\//.test(values.address)) return "アドレスはHTTPまたはHTTPS形式で入力してください";
    if (!values.login_id.trim()) return "IDは必須です";
    if (!camera && !values.password.trim()) return "パスワードは必須です";
    if (values.capture_interval_minutes < 1) return "取得間隔は1分以上で入力してください";
    if (values.retention_days < 1) return "保存期間は1日以上で入力してください";
    if (values.ai_text.length > 2000) return "AIテキストは2000文字以内で入力してください";
    return "";
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const nextError = validate();
    setFormError(nextError);
    if (!nextError) onSave(values);
  };

  return (
    <form className="form-panel" onSubmit={submit}>
      <div className="form-grid">
        <label>
          <span>カメラ名</span>
          <input value={values.camera_name} maxLength={100} placeholder="例：正面入口カメラ" onChange={(event) => update("camera_name", event.target.value)} />
        </label>
        <label>
          <span>アドレス</span>
          <input value={values.address} maxLength={2048} placeholder="例：http://192.168.1.10/snapshot.jpg" onChange={(event) => update("address", event.target.value)} />
        </label>
        <label>
          <span>認証方式</span>
          <select value={values.auth_method} disabled><option value="basic">BASIC認証</option></select>
        </label>
        <label>
          <span>ID</span>
          <input value={values.login_id} maxLength={255} placeholder="カメラ接続用ID" onChange={(event) => update("login_id", event.target.value)} />
        </label>
        <label>
          <span>パスワード</span>
          <input
            value={values.password}
            type="password"
            maxLength={1024}
            placeholder={camera ? "変更する場合のみ入力" : "カメラ接続用パスワード"}
            onChange={(event) => update("password", event.target.value)}
          />
        </label>
        <label>
          <span>取得間隔</span>
          <div className="unit-input">
            <input value={values.capture_interval_minutes} type="number" min={1} onChange={(event) => update("capture_interval_minutes", Number(event.target.value))} />
            <span>分</span>
          </div>
        </label>
        <label>
          <span>保存画質</span>
          <select value={values.image_quality} onChange={(event) => update("image_quality", event.target.value as ImageQuality)}>
            {qualityOptions.map((quality) => <option key={quality} value={quality}>{qualityLabels[quality]}</option>)}
          </select>
        </label>
        <label>
          <span>保存期間</span>
          <div className="unit-input">
            <input value={values.retention_days} type="number" min={1} onChange={(event) => update("retention_days", Number(event.target.value))} />
            <span>日</span>
          </div>
        </label>
        <label className="form-span-all">
          <span>AIテキスト</span>
          <textarea
            value={values.ai_text}
            maxLength={2000}
            placeholder="例：画像内の危険箇所、人物、車両、異常の有無を256文字以内で要約してください"
            onChange={(event) => update("ai_text", event.target.value)}
          />
        </label>
      </div>
      {formError && <div className="error-box">{formError}</div>}
      <div className="footer-actions">
        <button type="button" className="ghost" onClick={onCancel}>キャンセル</button>
        <button type="button" onClick={() => onTest(values)}>接続テスト</button>
        <button type="submit" className="primary">保存</button>
      </div>
    </form>
  );
}

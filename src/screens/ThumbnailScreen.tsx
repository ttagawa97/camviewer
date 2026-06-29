import { DayPicker } from "@daypicker/react";
import { ja } from "@daypicker/react/locale";
import "@daypicker/react/style.css";
import { useEffect, useMemo, useRef, useState } from "react";
import type { AvailableDate, Camera, CapturedImage } from "../types";
import { formatDateKeyWithWeek, formatDateTime, parseDateKey, statusLabel, toDateKey } from "../utils/format";

export function ThumbnailScreen(props: {
  cameras: Camera[];
  images: CapturedImage[];
  selectedCamera: Camera | null;
  selectedDate: string;
  availableDates: AvailableDate[];
  checkedCameraIds: string[];
  canManageCameras: boolean;
  onSelectCamera: (camera: Camera) => void;
  onToggleCamera: (cameraId: string) => void;
  onDateChange: (date: string) => void;
  onOpenImage: (image: CapturedImage) => void;
  onOpenSettings: () => void;
  onOpenLatest: () => void;
  onBackSite?: () => void;
  onBackCompany?: () => void;
}) {
  const availableDateMap = useMemo(
    () => new Map(props.availableDates.map((item) => [item.date, item])),
    [props.availableDates]
  );
  const selectedCalendarDate = props.selectedDate ? parseDateKey(props.selectedDate) : undefined;
  const defaultCalendarDate = selectedCalendarDate ?? parseDateKey(props.availableDates[0]?.date ?? "");
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const calendarDropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isCalendarOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!calendarDropdownRef.current?.contains(event.target as Node)) setIsCalendarOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsCalendarOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isCalendarOpen]);

  return (
    <section className="split-layout">
      <aside className="camera-pane">
        <div className="pane-heading">
          <h2>カメラメニュー</h2>
          {props.canManageCameras && <button className="icon-button" title="カメラ設定" onClick={props.onOpenSettings}>設定</button>}
        </div>
        <div className="camera-list">
          {props.cameras.map((camera) => (
            <div className={`camera-row ${props.selectedCamera?.camera_id === camera.camera_id ? "active" : ""}`} key={camera.camera_id}>
              <input
                type="checkbox"
                checked={props.checkedCameraIds.includes(camera.camera_id)}
                onChange={() => props.onToggleCamera(camera.camera_id)}
                aria-label={`${camera.camera_name}をまとめて参照に含める`}
              />
              <button onClick={() => props.onSelectCamera(camera)}>
                <strong>{camera.camera_name}</strong>
                <span className={`status ${camera.last_capture_status ?? "not_yet"}`}>{statusLabel(camera.last_capture_status)}</span>
                <small>{formatDateTime(camera.last_capture_at)}</small>
              </button>
            </div>
          ))}
          {props.cameras.length === 0 && <div className="empty-state">登録済みカメラがありません</div>}
        </div>
        <button className="primary wide" disabled={props.checkedCameraIds.length === 0} onClick={props.onOpenLatest}>まとめて参照</button>
        <div className="stacked-actions">
          {props.onBackSite && <button className="ghost" onClick={props.onBackSite}>現場選択へ戻る</button>}
          {props.onBackCompany && <button className="ghost" onClick={props.onBackCompany}>企業選択へ戻る</button>}
        </div>
      </aside>

      <section className="image-pane">
        <div className="toolbar">
          <div className="camera-title-slot">
            <h2>{props.selectedCamera?.camera_name ?? "カメラ未選択"}</h2>
          </div>
          <div className="date-dropdown" ref={calendarDropdownRef}>
            <button
              className="date-dropdown-button"
              type="button"
              aria-expanded={isCalendarOpen}
              disabled={props.availableDates.length === 0}
              onClick={() => setIsCalendarOpen((current) => !current)}
            >
              {props.selectedDate ? formatDateKeyWithWeek(props.selectedDate) : "選択可能な画像日付がありません"}
            </button>
            {isCalendarOpen && (
              <div className="calendar-picker">
                <DayPicker
                  key={`${props.selectedCamera?.camera_id ?? "no-camera"}-${props.availableDates[0]?.date ?? "no-date"}`}
                  mode="single"
                  locale={ja}
                  selected={selectedCalendarDate}
                  defaultMonth={defaultCalendarDate}
                  disabled={(date) => !availableDateMap.has(toDateKey(date))}
                  modifiers={{
                    hasImages: (date) => availableDateMap.has(toDateKey(date))
                  }}
                  modifiersClassNames={{
                    hasImages: "calendar-day-has-images"
                  }}
                  onSelect={(date) => {
                    if (!date) return;
                    const dateKey = toDateKey(date);
                    if (!availableDateMap.has(dateKey)) return;
                    props.onDateChange(dateKey);
                    setIsCalendarOpen(false);
                  }}
                />
              </div>
            )}
          </div>
        </div>
        <div className="thumbnail-grid">
          {props.images.map((image) => (
            <button className="thumbnail" key={image.image_id} onDoubleClick={() => props.onOpenImage(image)}>
              <img src={image.thumbnail_url} alt={`${image.camera_name ?? ""} ${formatDateTime(image.captured_at)}`} />
              <span>{formatDateTime(image.captured_at)}</span>
            </button>
          ))}
        </div>
        {props.images.length === 0 && <div className="empty-state">選択した日付の画像はありません</div>}
      </section>
    </section>
  );
}

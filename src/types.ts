export type Role = "system_admin" | "company_admin" | "site_admin" | "general_user";
export type Screen =
  | "login"
  | "companySelect"
  | "companyForm"
  | "siteSelect"
  | "siteForm"
  | "thumbnail"
  | "cameraSetting"
  | "cameraForm"
  | "multiLatest";
export type Status = "active" | "inactive" | "deleted";
export type CaptureStatus = "success" | "failed" | "not_yet";
export type ImageQuality = "VGA" | "SVGA" | "WXGA" | "HD" | "FullHD" | "4K";

export interface User {
  user_id: string;
  login_id: string;
  user_name: string;
  role: Role;
  company_id: string | null;
  site_id: string | null;
  initial_screen?: string;
  permissions?: Record<string, boolean>;
}

export interface Company {
  company_id: string;
  company_name: string;
  status: Status;
  site_count?: number;
  camera_count?: number;
}

export interface Site {
  site_id: string;
  company_id: string;
  site_name: string;
  status: Status;
  camera_count?: number;
  latest_captured_at?: string | null;
}

export interface Camera {
  camera_id: string;
  company_id?: string;
  site_id?: string;
  camera_name: string;
  address?: string;
  auth_method?: "basic";
  login_id?: string;
  capture_interval_minutes: number;
  image_quality: ImageQuality;
  retention_days?: number;
  status: Status;
  last_capture_at?: string | null;
  last_capture_status?: CaptureStatus | null;
  last_capture_error?: string | null;
}

export interface AvailableDate {
  date: string;
  image_count: number;
  latest_captured_at?: string;
}

export interface CapturedImage {
  image_id: string;
  camera_id?: string;
  camera_name?: string;
  captured_at: string;
  thumbnail_url: string;
  image_url: string;
  image_quality: ImageQuality;
  width?: number | null;
  height?: number | null;
  file_size_bytes?: number | null;
}

export interface LatestImage {
  camera_id: string;
  camera_name: string;
  latest_status: CaptureStatus;
  latest_image_id: string | null;
  latest_captured_at: string | null;
  latest_image_url: string | null;
  latest_thumbnail_url: string | null;
  latest_error: string | null;
}

export interface CameraFormValues {
  camera_id?: string;
  camera_name: string;
  address: string;
  auth_method: "basic";
  login_id: string;
  password: string;
  capture_interval_minutes: number;
  image_quality: ImageQuality;
  retention_days: number;
}

export interface CompanyFormValues {
  company_name: string;
}

export interface SiteFormValues {
  company_id: string;
  site_name: string;
}

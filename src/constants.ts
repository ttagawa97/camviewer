import type { CameraFormValues, CompanyFormValues, ImageQuality, SiteFormValues } from "./types";

export const qualityOptions: ImageQuality[] = ["VGA", "SVGA", "WXGA", "HD", "FullHD", "4K"];

export const qualityLabels: Record<ImageQuality, string> = {
  VGA: "VGA (640 x 480)",
  SVGA: "SVGA (800 x 600)",
  WXGA: "WXGA (1280 x 800)",
  HD: "HD (1280 x 720)",
  FullHD: "FullHD (1920 x 1080)",
  "4K": "4K (3840 x 2160)"
};

export const emptyCameraForm: CameraFormValues = {
  camera_name: "",
  address: "",
  auth_method: "basic",
  login_id: "",
  password: "",
  capture_interval_minutes: 1,
  image_quality: "FullHD",
  retention_days: 30
};

export const emptyCompanyForm: CompanyFormValues = {
  company_name: ""
};

export const emptySiteForm: SiteFormValues = {
  company_id: "",
  site_name: ""
};

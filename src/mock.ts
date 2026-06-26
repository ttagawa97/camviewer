import type { AvailableDate, Camera, CapturedImage, Company, LatestImage, Role, Site, User } from "./types";

const users: Record<string, User> = {
  admin: {
    user_id: "user_admin",
    login_id: "admin",
    user_name: "システム管理者",
    role: "system_admin",
    company_id: null,
    site_id: null,
    initial_screen: "SCR_COMPANY_SELECT"
  },
  company: {
    user_id: "user_company",
    login_id: "company",
    user_name: "企業管理者",
    role: "company_admin",
    company_id: "company_1",
    site_id: null,
    initial_screen: "SCR_SITE_SELECT"
  },
  site: {
    user_id: "user_site",
    login_id: "site",
    user_name: "現場管理者",
    role: "site_admin",
    company_id: "company_1",
    site_id: "site_1",
    initial_screen: "SCR_CAMERA_THUMBNAIL"
  },
  user: {
    user_id: "user_general",
    login_id: "user",
    user_name: "一般ユーザー",
    role: "general_user",
    company_id: "company_1",
    site_id: "site_1",
    initial_screen: "SCR_CAMERA_THUMBNAIL"
  }
};

let companySequence = 3;
let siteSequence = 4;

const companies: Company[] = [
  { company_id: "company_1", company_name: "A社", status: "active", site_count: 2, camera_count: 4 },
  { company_id: "company_2", company_name: "B社", status: "active", site_count: 1, camera_count: 1 }
];

const sites: Site[] = [
  { site_id: "site_1", company_id: "company_1", site_name: "札幌第1現場", status: "active", camera_count: 3, latest_captured_at: "2026-06-25T15:58:00+09:00" },
  { site_id: "site_2", company_id: "company_1", site_name: "東京倉庫", status: "active", camera_count: 1, latest_captured_at: null },
  { site_id: "site_3", company_id: "company_2", site_name: "福岡支店", status: "active", camera_count: 1, latest_captured_at: "2026-06-25T15:44:00+09:00" }
];

const cameras: Camera[] = [
  {
    camera_id: "camera_1",
    company_id: "company_1",
    site_id: "site_1",
    camera_name: "正面入口カメラ",
    address: "http://192.168.1.10/snapshot.jpg",
    auth_method: "basic",
    login_id: "camera",
    capture_interval_minutes: 1,
    image_quality: "FullHD",
    retention_days: 30,
    status: "active",
    last_capture_at: "2026-06-25T15:58:00+09:00",
    last_capture_status: "success"
  },
  {
    camera_id: "camera_2",
    company_id: "company_1",
    site_id: "site_1",
    camera_name: "資材置場",
    address: "http://192.168.1.11/snapshot.jpg",
    auth_method: "basic",
    login_id: "camera",
    capture_interval_minutes: 5,
    image_quality: "HD",
    retention_days: 14,
    status: "active",
    last_capture_at: "2026-06-25T15:55:00+09:00",
    last_capture_status: "failed",
    last_capture_error: "CAMERA_TIMEOUT"
  },
  {
    camera_id: "camera_3",
    company_id: "company_1",
    site_id: "site_1",
    camera_name: "搬入口",
    address: "http://192.168.1.12/snapshot.jpg",
    auth_method: "basic",
    login_id: "camera",
    capture_interval_minutes: 10,
    image_quality: "WXGA",
    retention_days: 60,
    status: "active",
    last_capture_at: null,
    last_capture_status: "not_yet"
  }
];

const placeholder = (label: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540"><rect width="960" height="540" fill="#d8e3df"/><path d="M0 410h960v130H0z" fill="#7f9b91"/><path d="M80 380h180v-120h220v120h110v-80h210v80h80v30H80z" fill="#526f69"/><text x="48" y="72" fill="#1b2d2a" font-family="sans-serif" font-size="34">${label}</text></svg>`
  )}`;

const images: CapturedImage[] = Array.from({ length: 12 }, (_, index) => ({
  image_id: `image_${index + 1}`,
  camera_id: "camera_1",
  camera_name: "正面入口カメラ",
  captured_at: `2026-06-25T${String(15 - Math.floor(index / 4)).padStart(2, "0")}:${String(58 - (index % 4) * 5).padStart(2, "0")}:00+09:00`,
  thumbnail_url: placeholder(`正面入口 ${index + 1}`),
  image_url: placeholder(`正面入口 ${index + 1}`),
  image_quality: "FullHD",
  width: 1920,
  height: 1080
}));

export function mockLogin(loginId: string, password: string): User | null {
  if (password !== "admin" && password !== "password") return null;
  return users[loginId] ?? null;
}

export const mock = {
  companies: (keyword = "") => companies.filter((item) => item.company_name.includes(keyword)),
  createCompany: (companyName: string): Company => {
    const company: Company = {
      company_id: `company_${companySequence++}`,
      company_name: companyName,
      status: "active",
      site_count: 0,
      camera_count: 0
    };
    companies.unshift(company);
    return company;
  },
  sites: (companyId?: string | null, keyword = "") =>
    sites.filter((item) => (!companyId || item.company_id === companyId) && item.site_name.includes(keyword)),
  createSite: (companyId: string, siteName: string): Site => {
    const site: Site = {
      site_id: `site_${siteSequence++}`,
      company_id: companyId,
      site_name: siteName,
      status: "active",
      camera_count: 0,
      latest_captured_at: null
    };
    sites.unshift(site);
    const company = companies.find((item) => item.company_id === companyId);
    if (company) company.site_count = (company.site_count ?? 0) + 1;
    return site;
  },
  cameras: (_companyId?: string | null, siteId?: string | null, keyword = "") =>
    cameras.filter((item) => (!siteId || item.site_id === siteId) && item.camera_name.includes(keyword)),
  camera: (cameraId: string) => cameras.find((camera) => camera.camera_id === cameraId) ?? null,
  availableDates: (): { available_dates: AvailableDate[]; default_date: string } => ({
    default_date: "2026-06-25",
    available_dates: [
      { date: "2026-06-25", image_count: images.length, latest_captured_at: "2026-06-25T15:58:00+09:00" },
      { date: "2026-06-24", image_count: 10, latest_captured_at: "2026-06-24T18:00:00+09:00" }
    ]
  }),
  thumbnails: (cameraId: string) => (cameraId === "camera_1" ? images : []),
  latestBulk: (cameraIds: string[]): { server_time: string; cameras: LatestImage[] } => ({
    server_time: new Date().toISOString(),
    cameras: cameraIds.map((cameraId) => {
      const camera = cameras.find((item) => item.camera_id === cameraId);
      return {
        camera_id: cameraId,
        camera_name: camera?.camera_name ?? cameraId,
        latest_status: camera?.last_capture_status ?? "not_yet",
        latest_image_id: cameraId === "camera_1" ? "image_1" : null,
        latest_captured_at: camera?.last_capture_at ?? null,
        latest_image_url: cameraId === "camera_1" ? placeholder(camera?.camera_name ?? cameraId) : null,
        latest_thumbnail_url: cameraId === "camera_1" ? placeholder(camera?.camera_name ?? cameraId) : null,
        latest_error: camera?.last_capture_error ?? null
      };
    })
  })
};

export function roleLabel(role: Role) {
  return {
    system_admin: "システム管理者",
    company_admin: "企業管理者",
    site_admin: "現場管理者",
    general_user: "一般ユーザー"
  }[role];
}

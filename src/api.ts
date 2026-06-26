import type {
  AvailableDate,
  Camera,
  CameraFormValues,
  CapturedImage,
  Company,
  CompanyFormValues,
  LatestImage,
  SiteFormValues,
  Site,
  User
} from "./types";

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  message?: string;
}

const apiBase = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";

let accessToken = localStorage.getItem("camviewer.accessToken") ?? "";

interface ApiUserRole {
  role?: User["role"];
  company?: string | null;
  site?: string | null;
}

interface ApiUser {
  id: number | string;
  username: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  role?: ApiUserRole | null;
  is_active?: boolean;
}

interface LoginResponse {
  success?: boolean;
  message?: string;
  access_token?: string;
  csrf_token?: string;
  user: User | ApiUser;
}

export function setAccessToken(token: string) {
  accessToken = token;
  if (token) localStorage.setItem("camviewer.accessToken", token);
  else localStorage.removeItem("camviewer.accessToken");
}

let csrfToken = localStorage.getItem("camviewer.csrfToken") ?? "";

function setCsrfToken(token: string) {
  csrfToken = token;
  if (token) localStorage.setItem("camviewer.csrfToken", token);
  else localStorage.removeItem("camviewer.csrfToken");
}

function readCookie(name: string) {
  const prefix = `${name}=`;
  return document.cookie
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(prefix))
    ?.slice(prefix.length) ?? "";
}

async function readErrorMessage(response: Response) {
  const fallback = response.status === 401 ? "ログインIDまたはパスワードが正しくありません" : `API error: ${response.status}`;
  const contentType = response.headers.get("Content-Type") ?? "";

  try {
    if (contentType.includes("application/json")) {
      const body = (await response.json()) as { message?: unknown; error?: unknown; detail?: unknown };
      const message = body.message ?? body.error ?? body.detail;
      return typeof message === "string" && message.trim() ? message : fallback;
    }

    const text = await response.text();
    if (!text.trim() || contentType.includes("text/html") || /^\s*</.test(text)) return fallback;
    return text.trim().slice(0, 300);
  } catch {
    return fallback;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  const method = (options.method ?? "GET").toUpperCase();
  const nextCsrfToken = csrfToken || readCookie("csrftoken");
  if (nextCsrfToken && !["GET", "HEAD", "OPTIONS", "TRACE"].includes(method)) {
    headers.set("X-CSRFToken", nextCsrfToken);
  }

  const response = await fetch(`${apiBase}${path}`, { credentials: "include", ...options, headers });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  const contentType = response.headers.get("Content-Type") ?? "";
  if (!contentType.includes("application/json")) return response as T;

  const body = (await response.json()) as ApiEnvelope<T> | T;
  if (typeof body === "object" && body && "success" in body && "data" in body) {
    const envelope = body as ApiEnvelope<T>;
    if (!envelope.success) throw new Error(envelope.message || "API request failed");
    return envelope.data as T;
  }
  return body as T;
}

function normalizeUser(user: User | ApiUser): User {
  if ("login_id" in user) return user;

  return {
    user_id: String(user.id),
    login_id: user.username,
    user_name: [user.last_name, user.first_name].filter(Boolean).join(" ") || user.username,
    role: user.role?.role ?? "general_user",
    company_id: user.role?.company ?? null,
    site_id: user.role?.site ?? null
  };
}

function normalizeCompany(company: Company | { id?: number | string; name?: string; is_active?: boolean; site_count?: number }): Company {
  if ("company_id" in company) return company;

  return {
    company_id: String(company.id ?? ""),
    company_name: company.name ?? "",
    status: company.is_active === false ? "inactive" : "active",
    site_count: company.site_count,
    camera_count: 0
  };
}

export const api = {
  async login(login_id: string, password: string) {
    const data = await request<LoginResponse>("/auth/login/", {
      method: "POST",
      body: JSON.stringify({ username: login_id, password })
    });
    if (data.success === false) throw new Error(data.message || "ログインIDまたはパスワードが正しくありません");
    setAccessToken(data.access_token ?? "");
    setCsrfToken(data.csrf_token ?? "");
    return normalizeUser(data.user);
  },

  async logout() {
    try {
      await request("/auth/logout/", { method: "POST", body: "{}" });
    } finally {
      setAccessToken("");
      setCsrfToken("");
    }
  },

  me: () => request<User | ApiUser>("/auth/me/").then(normalizeUser),

  companies: (keyword = "") =>
    request<{ companies?: Company[]; results?: Company[] } | Company[]>(
      `/companies/?status=active&page=1&page_size=100${keyword ? `&keyword=${encodeURIComponent(keyword)}` : ""}`
    ).then((data) => {
      const rows = Array.isArray(data) ? data : data.companies ?? data.results ?? [];
      return rows.map(normalizeCompany);
    }),

  createCompany: (values: CompanyFormValues) =>
    request<{ company_id: string; company_name: string; status: string }>("/companies/", {
      method: "POST",
      body: JSON.stringify(values)
    }),

  sites: (companyId?: string, keyword = "") => {
    const params = new URLSearchParams({ status: "active", page: "1", page_size: "100" });
    if (companyId) params.set("company_id", companyId);
    if (keyword) params.set("keyword", keyword);
    return request<{ sites: Site[] }>(`/sites/?${params.toString()}`).then((data) => data.sites);
  },

  createSite: (values: SiteFormValues) =>
    request<{ site_id: string; company_id: string; site_name: string; status: string }>("/sites/", {
      method: "POST",
      body: JSON.stringify(values)
    }),

  cameras: (companyId?: string | null, siteId?: string | null, keyword = "") => {
    const params = new URLSearchParams();
    if (companyId) params.set("company_id", companyId);
    if (siteId) params.set("site_id", siteId);
    if (keyword) params.set("keyword", keyword);
    return request<{ cameras: Camera[] }>(`/cameras/?${params.toString()}`).then((data) => data.cameras);
  },

  camera: (cameraId: string) => request<Camera>(`/cameras/${cameraId}/`),

  createCamera: (values: CameraFormValues, companyId?: string | null, siteId?: string | null) =>
    request<{ camera_id: string; camera_name: string; status: string }>("/cameras/", {
      method: "POST",
      body: JSON.stringify({ ...values, company_id: companyId, site_id: siteId })
    }),

  updateCamera: (cameraId: string, values: CameraFormValues) =>
    request<{ camera_id: string; camera_name: string; updated_at: string }>(`/cameras/${cameraId}/`, {
      method: "PUT",
      body: JSON.stringify(values)
    }),

  deleteCamera: (cameraId: string) => request(`/cameras/${cameraId}/?delete_images=false`, { method: "DELETE" }),

  testConnection: (values: Partial<CameraFormValues>, companyId?: string | null, siteId?: string | null) =>
    request<{
      result: "success" | "failed";
      http_status_code: number | null;
      response_time_ms: number | null;
      message: string;
      preview_image_url: string | null;
      error_code: string | null;
    }>("/cameras/test-connection/", {
      method: "POST",
      body: JSON.stringify({ ...values, company_id: companyId, site_id: siteId })
    }),

  testSavedCamera: (cameraId: string) =>
    request<{
      result: "success" | "failed";
      http_status_code: number | null;
      response_time_ms: number | null;
      message: string;
      preview_image_url: string | null;
      error_code: string | null;
    }>(`/cameras/${cameraId}/test-connection/`, { method: "POST" }),

  availableDates: (companyId?: string | null, siteId?: string | null, cameraId?: string | null) => {
    const params = new URLSearchParams();
    if (companyId) params.set("company_id", companyId);
    if (siteId) params.set("site_id", siteId);
    if (cameraId) params.set("camera_id", cameraId);
    return request<{ available_dates: AvailableDate[]; default_date?: string }>(
      `/images/available-dates/?${params.toString()}`
    );
  },

  thumbnails: (cameraId: string, date: string) =>
    request<{ camera: Pick<Camera, "camera_id" | "camera_name">; date: string; images: CapturedImage[] }>(
      `/images/thumbnails/?camera_id=${encodeURIComponent(cameraId)}&date=${encodeURIComponent(date)}&sort=captured_at_desc&page=1&page_size=100`
    ).then((data) => data.images),

  latestBulk: (cameraIds: string[]) =>
    request<{ server_time: string; cameras: LatestImage[] }>("/images/latest/bulk/", {
      method: "POST",
      body: JSON.stringify({ camera_ids: cameraIds })
    })
};

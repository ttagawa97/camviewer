import type { Camera, Company, Screen, Site, User } from "./types";

const storedUserKey = "camviewer.user";
const storedViewKey = "camviewer.view";

export interface StoredView {
  user_id: string;
  screen: Screen;
  selectedCompany: Company | null;
  selectedSite: Site | null;
  selectedCamera: Camera | null;
  userManagementContext: { scope: "company" | "site"; company: Company | null; site: Site | null } | null;
  checkedCameraIds: string[];
  selectedDate: string;
  editingCameraId: string | null;
}

const screens: Screen[] = [
  "login",
  "companySelect",
  "companyForm",
  "siteSelect",
  "siteForm",
  "userManagement",
  "thumbnail",
  "cameraSetting",
  "cameraForm",
  "multiLatest"
];

export function loadStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(storedUserKey);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    localStorage.removeItem(storedUserKey);
    return null;
  }
}

export function storeUser(user: User | null) {
  if (user) localStorage.setItem(storedUserKey, JSON.stringify(user));
  else localStorage.removeItem(storedUserKey);
}

export function loadStoredView(userId?: string | null): StoredView | null {
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(storedViewKey);
    const view = raw ? (JSON.parse(raw) as Partial<StoredView>) : null;
    if (!view || view.user_id !== userId || !screens.includes(view.screen as Screen) || view.screen === "login") return null;
    return {
      user_id: userId,
      screen: view.screen as Screen,
      selectedCompany: view.selectedCompany ?? null,
      selectedSite: view.selectedSite ?? null,
      selectedCamera: view.selectedCamera ?? null,
      userManagementContext: view.userManagementContext ?? null,
      checkedCameraIds: Array.isArray(view.checkedCameraIds) ? view.checkedCameraIds : [],
      selectedDate: typeof view.selectedDate === "string" ? view.selectedDate : "",
      editingCameraId: typeof view.editingCameraId === "string" ? view.editingCameraId : null
    };
  } catch {
    localStorage.removeItem(storedViewKey);
    return null;
  }
}

export function storeView(view: StoredView | null) {
  if (view) localStorage.setItem(storedViewKey, JSON.stringify(view));
  else localStorage.removeItem(storedViewKey);
}

export function initialScreenFor(user: User): Screen {
  if (user.role === "system_admin") return "companySelect";
  if (user.role === "company_admin") return "siteSelect";
  return "thumbnail";
}

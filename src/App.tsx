import { DayPicker } from "@daypicker/react";
import { ja } from "@daypicker/react/locale";
import "@daypicker/react/style.css";
import { Component, FormEvent, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "./api";
import { mock, mockLogin, roleLabel } from "./mock";
import type {
  AvailableDate,
  Camera,
  CameraFormValues,
  CapturedImage,
  Company,
  CompanyFormValues,
  ImageQuality,
  LatestImage,
  Screen,
  Site,
  SiteFormValues,
  User
} from "./types";

const qualityOptions: ImageQuality[] = ["VGA", "SVGA", "WXGA", "HD", "FullHD", "4K"];
const qualityLabels: Record<ImageQuality, string> = {
  VGA: "VGA (640 x 480)",
  SVGA: "SVGA (800 x 600)",
  WXGA: "WXGA (1280 x 800)",
  HD: "HD (1280 x 720)",
  FullHD: "FullHD (1920 x 1080)",
  "4K": "4K (3840 x 2160)"
};

const emptyForm: CameraFormValues = {
  camera_name: "",
  address: "",
  auth_method: "basic",
  login_id: "",
  password: "",
  capture_interval_minutes: 1,
  image_quality: "FullHD",
  retention_days: 30
};

const emptyCompanyForm: CompanyFormValues = {
  company_name: ""
};

const emptySiteForm: SiteFormValues = {
  company_id: "",
  site_name: ""
};

const storedUserKey = "camviewer.user";
const storedViewKey = "camviewer.view";

interface StoredView {
  user_id: string;
  screen: Screen;
  selectedCompany: Company | null;
  selectedSite: Site | null;
  selectedCamera: Camera | null;
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
  "thumbnail",
  "cameraSetting",
  "cameraForm",
  "multiLatest"
];

function loadStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(storedUserKey);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    localStorage.removeItem(storedUserKey);
    return null;
  }
}

function storeUser(user: User | null) {
  if (user) localStorage.setItem(storedUserKey, JSON.stringify(user));
  else localStorage.removeItem(storedUserKey);
}

function loadStoredView(userId?: string | null): StoredView | null {
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
      checkedCameraIds: Array.isArray(view.checkedCameraIds) ? view.checkedCameraIds : [],
      selectedDate: typeof view.selectedDate === "string" ? view.selectedDate : "",
      editingCameraId: typeof view.editingCameraId === "string" ? view.editingCameraId : null
    };
  } catch {
    localStorage.removeItem(storedViewKey);
    return null;
  }
}

function storeView(view: StoredView | null) {
  if (view) localStorage.setItem(storedViewKey, JSON.stringify(view));
  else localStorage.removeItem(storedViewKey);
}

function initialScreenFor(user: User): Screen {
  if (user.role === "system_admin") return "companySelect";
  if (user.role === "company_admin") return "siteSelect";
  return "thumbnail";
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone: "Asia/Tokyo"
  }).format(date);
}

function parseDateKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateKeyWithWeek(value: string) {
  const date = parseDateKey(value);
  if (!date) return value;
  const week = new Intl.DateTimeFormat("ja-JP", { weekday: "short" }).format(date);
  return `${value}(${week})`;
}

function statusLabel(status?: string | null) {
  if (status === "success") return "正常";
  if (status === "failed") return "取得失敗";
  if (status === "not_yet") return "未取得";
  if (status === "active") return "有効";
  if (status === "inactive") return "停止";
  return "-";
}

export default function App() {
  return (
    <AppErrorBoundary>
      <AppContent />
    </AppErrorBoundary>
  );
}

class AppErrorBoundary extends Component<{ children: ReactNode }, { message: string }> {
  state = { message: "" };

  static getDerivedStateFromError(error: unknown) {
    return { message: error instanceof Error ? error.message : "画面の表示中にエラーが発生しました" };
  }

  render() {
    if (this.state.message) {
      return (
        <main className="app-shell">
          <section className="content-panel">
            <div className="error-box">{this.state.message}</div>
            <div className="footer-actions">
              <button className="primary" onClick={() => window.location.reload()}>再読み込み</button>
            </div>
          </section>
        </main>
      );
    }
    return this.props.children;
  }
}

function AppContent() {
  const [useMock] = useState(() => import.meta.env.VITE_USE_MOCK === "true");
  const authCheckVersion = useRef(0);
  const [user, setUser] = useState<User | null>(() => loadStoredUser());
  const initialStoredView = useMemo(() => loadStoredView(user?.user_id), []);
  const [authChecked, setAuthChecked] = useState(() => useMock || !loadStoredUser());
  const [screen, setScreen] = useState<Screen>(() => {
    const storedUser = loadStoredUser();
    const storedView = loadStoredView(storedUser?.user_id);
    return storedUser ? storedView?.screen ?? initialScreenFor(storedUser) : "login";
  });
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(() => initialStoredView?.selectedCompany ?? null);
  const [selectedSite, setSelectedSite] = useState<Site | null>(() => initialStoredView?.selectedSite ?? null);
  const [selectedCamera, setSelectedCamera] = useState<Camera | null>(() => initialStoredView?.selectedCamera ?? null);
  const [checkedCameraIds, setCheckedCameraIds] = useState<string[]>(() => initialStoredView?.checkedCameraIds ?? []);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [availableDates, setAvailableDates] = useState<AvailableDate[]>([]);
  const [selectedDate, setSelectedDate] = useState(() => initialStoredView?.selectedDate ?? "");
  const [images, setImages] = useState<CapturedImage[]>([]);
  const [latestImages, setLatestImages] = useState<LatestImage[]>([]);
  const [activeImage, setActiveImage] = useState<CapturedImage | LatestImage | null>(null);
  const [editingCameraId, setEditingCameraId] = useState<string | null>(() => initialStoredView?.editingCameraId ?? null);
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const canManageCameras = user?.role === "system_admin" || user?.role === "company_admin" || user?.role === "site_admin";
  const contextCompanyId = selectedCompany?.company_id ?? user?.company_id ?? null;
  const contextSiteId = selectedSite?.site_id ?? user?.site_id ?? null;

  const selectedCompanyName = selectedCompany?.company_name ?? (user?.company_id ? companies.find((item) => item.company_id === user.company_id)?.company_name : "");
  const selectedSiteName = selectedSite?.site_name ?? (user?.site_id ? sites.find((item) => item.site_id === user.site_id)?.site_name : "");

  const breadcrumb = useMemo(() => {
    const items: string[] = [];
    if (screen === "companySelect") return "企業選択";
    if (screen === "companyForm") return "企業選択 > 企業追加";

    if (selectedCompanyName) items.push(selectedCompanyName);
    if (screen === "siteSelect") items.push("現場選択");
    if (screen === "siteForm") items.push("現場選択", "現場追加");

    if (["thumbnail", "cameraSetting", "cameraForm", "multiLatest"].includes(screen) && selectedSiteName) items.push(selectedSiteName);
    if (screen === "thumbnail") items.push("カメラ画像");
    if (screen === "cameraSetting") items.push("カメラ画像", "カメラ設定");
    if (screen === "cameraForm") items.push("カメラ画像", "カメラ設定", editingCameraId ? "カメラ再設定" : "カメラ追加");
    if (screen === "multiLatest") items.push("カメラ画像", "複数カメラ最新画像");
    return items.join(" > ");
  }, [editingCameraId, screen, selectedCompanyName, selectedSiteName]);

  const goCompanySelect = () => {
    setSelectedCompany(null);
    setSelectedSite(null);
    setSelectedCamera(null);
    setCheckedCameraIds([]);
    setScreen("companySelect");
  };

  const goSiteSelect = () => {
    setSelectedSite(null);
    setSelectedCamera(null);
    setCheckedCameraIds([]);
    setScreen("siteSelect");
  };

  const selectCompany = (company: Company) => {
    setSelectedCompany(company);
    setSelectedSite(null);
    setSelectedCamera(null);
    setCheckedCameraIds([]);
    setScreen("siteSelect");
  };

  const selectSite = (site: Site) => {
    setSelectedSite(site);
    setSelectedCamera(null);
    setCheckedCameraIds([]);
    setScreen("thumbnail");
  };

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2800);
  };

  const withLoading = async (task: () => Promise<void>) => {
    setLoading(true);
    setError("");
    try {
      await task();
    } catch (err) {
      setError(err instanceof Error ? err.message : "サーバーとの通信に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const storedUser = loadStoredUser();
    if (useMock || !storedUser) {
      setAuthChecked(true);
      return;
    }

    let cancelled = false;
    const version = ++authCheckVersion.current;
    api.me()
      .then((nextUser) => {
        if (cancelled || version !== authCheckVersion.current) return;
        storeUser(nextUser);
        setUser(nextUser);
        setScreen((current) => (current === "login" ? initialScreenFor(nextUser) : current));
      })
      .catch(() => {
        if (cancelled || version !== authCheckVersion.current) return;
        storeUser(null);
        storeView(null);
        setUser(null);
        setScreen("login");
        setSelectedCompany(null);
        setSelectedSite(null);
        setSelectedCamera(null);
        setCheckedCameraIds([]);
      })
      .finally(() => {
        if (!cancelled && version === authCheckVersion.current) setAuthChecked(true);
      });

    return () => {
      cancelled = true;
    };
  }, [useMock]);

  useEffect(() => {
    if (!user || screen === "login") return;
    storeView({
      user_id: user.user_id,
      screen,
      selectedCompany,
      selectedSite,
      selectedCamera,
      checkedCameraIds,
      selectedDate,
      editingCameraId
    });
  }, [checkedCameraIds, editingCameraId, screen, selectedCamera, selectedCompany, selectedDate, selectedSite, user]);

  const loadCompanies = useCallback(
    (keyword = "") =>
      withLoading(async () => {
        setCompanies(useMock ? mock.companies(keyword) : await api.companies(keyword));
      }),
    [useMock]
  );

  const loadSites = useCallback(
    (companyId?: string | null, keyword = "") =>
      withLoading(async () => {
        setSites(useMock ? mock.sites(companyId, keyword) : await api.sites(companyId ?? undefined, keyword));
      }),
    [useMock]
  );

  const loadCameras = useCallback(
    (keyword = "") =>
      withLoading(async () => {
        const rows = useMock ? mock.cameras(contextCompanyId, contextSiteId, keyword) : await api.cameras(contextCompanyId, contextSiteId, keyword);
        setCameras(rows);
        setSelectedCamera((current) => current ?? rows[0] ?? null);
      }),
    [contextCompanyId, contextSiteId, useMock]
  );

  const loadDatesAndImages = useCallback(
    (camera: Camera | null) =>
      withLoading(async () => {
        if (!camera) {
          setAvailableDates([]);
          setSelectedDate("");
          setImages([]);
          return;
        }
        const dates = useMock ? mock.availableDates() : await api.availableDates(contextCompanyId, contextSiteId, camera.camera_id);
        setAvailableDates(dates.available_dates);
        const nextDate = selectedDate || dates.default_date || dates.available_dates[0]?.date || "";
        setSelectedDate(nextDate);
        setImages(nextDate ? (useMock ? mock.thumbnails(camera.camera_id) : await api.thumbnails(camera.camera_id, nextDate)) : []);
      }),
    [contextCompanyId, contextSiteId, selectedDate, useMock]
  );

  useEffect(() => {
    if (!authChecked || !user) return;
    if (screen === "companySelect" || screen === "siteForm") void loadCompanies();
    if (screen === "siteSelect" || screen === "thumbnail" || screen === "cameraSetting" || screen === "cameraForm") void loadSites(contextCompanyId);
    if (screen === "thumbnail" || screen === "cameraSetting" || screen === "cameraForm") void loadCameras();
  }, [authChecked, contextCompanyId, loadCameras, loadCompanies, loadSites, screen, user]);

  useEffect(() => {
    if (screen === "thumbnail") void loadDatesAndImages(selectedCamera);
  }, [loadDatesAndImages, screen, selectedCamera]);

  useEffect(() => {
    if (screen !== "multiLatest" || checkedCameraIds.length === 0) return;
    const load = async () => {
      setLatestImages(useMock ? mock.latestBulk(checkedCameraIds).cameras : (await api.latestBulk(checkedCameraIds)).cameras);
    };
    void load();
    const timer = window.setInterval(load, 60000);
    return () => window.clearInterval(timer);
  }, [checkedCameraIds, screen, useMock]);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    authCheckVersion.current += 1;
    setAuthChecked(true);
    const form = new FormData(event.currentTarget);
    const loginId = String(form.get("login_id") ?? "");
    const password = String(form.get("password") ?? "");

    await withLoading(async () => {
      let nextUser: User | null = null;
      if (!useMock) {
        nextUser = await api.login(loginId, password);
      } else {
        nextUser = mockLogin(loginId, password);
      }
      if (!nextUser) throw new Error("ログインIDまたはパスワードが正しくありません");
      if (!useMock) {
        nextUser = await api.me();
      }
      storeUser(nextUser);
      setUser(nextUser);
      setScreen(initialScreenFor(nextUser));
      if (nextUser.role !== "system_admin") {
        if (useMock) {
          const userSites = mock.sites(nextUser.company_id);
          setSites(userSites);
          setSelectedSite(userSites.find((site) => site.site_id === nextUser.site_id) ?? null);
        }
      }
    });
  };

  const logout = async () => {
    authCheckVersion.current += 1;
    try {
      if (!useMock) await api.logout();
    } finally {
      storeUser(null);
      storeView(null);
      setUser(null);
      setScreen("login");
      setSelectedCompany(null);
      setSelectedSite(null);
      setSelectedCamera(null);
      setCheckedCameraIds([]);
    }
  };

  const saveCompany = async (values: CompanyFormValues) => {
    await withLoading(async () => {
      const created = useMock ? mock.createCompany(values.company_name.trim()) : await api.createCompany(values);
      const nextCompany: Company = {
        company_id: created.company_id,
        company_name: created.company_name,
        status: "active",
        site_count: 0,
        camera_count: 0
      };
      setCompanies((current) => [nextCompany, ...current.filter((item) => item.company_id !== nextCompany.company_id)]);
      setSelectedCompany(null);
      setSelectedSite(null);
      showToast("企業を登録しました");
      setScreen("companySelect");
    });
  };

  const saveSite = async (values: SiteFormValues) => {
    await withLoading(async () => {
      const created = useMock ? mock.createSite(values.company_id, values.site_name.trim()) : await api.createSite(values);
      const nextSite: Site = {
        site_id: created.site_id,
        company_id: created.company_id,
        site_name: created.site_name,
        status: "active",
        camera_count: 0,
        latest_captured_at: null
      };
      setSites((current) => [nextSite, ...current.filter((item) => item.site_id !== nextSite.site_id)]);
      setCompanies((current) =>
        current.map((company) =>
          company.company_id === values.company_id ? { ...company, site_count: (company.site_count ?? 0) + 1 } : company
        )
      );
      setSelectedSite(null);
      showToast("現場を登録しました");
      setScreen("siteSelect");
    });
  };

  const saveCamera = async (values: CameraFormValues) => {
    await withLoading(async () => {
      if (!useMock) {
        if (editingCameraId) await api.updateCamera(editingCameraId, values);
        else await api.createCamera(values, contextCompanyId, contextSiteId);
      }
      showToast(editingCameraId ? "カメラ設定を保存しました" : "カメラを登録しました");
      setScreen("cameraSetting");
      setEditingCameraId(null);
      await loadCameras();
    });
  };

  const deleteCamera = async (cameraId: string) => {
    if (!window.confirm("選択したカメラを削除します。よろしいですか？")) return;
    await withLoading(async () => {
      if (!useMock) await api.deleteCamera(cameraId);
      showToast("カメラを削除しました");
      await loadCameras();
    });
  };

  const deleteCompany = async (company: Company) => {
    if (!window.confirm(`${company.company_name} を削除します。\n配下の現場、カメラ、撮影済みデータもすべて削除されます。\nよろしいですか？`)) return;
    await withLoading(async () => {
      if (!useMock) await api.deleteCompany(company.company_id);
      setCompanies((current) => current.filter((item) => item.company_id !== company.company_id));
      if (selectedCompany?.company_id === company.company_id) {
        setSelectedCompany(null);
        setSelectedSite(null);
        setSelectedCamera(null);
        setSites([]);
        setCameras([]);
      }
      showToast("企業を削除しました");
    });
  };

  const deleteSite = async (site: Site) => {
    if (!window.confirm(`${site.site_name} を削除します。\n配下のカメラ、撮影済みデータもすべて削除されます。\nよろしいですか？`)) return;
    await withLoading(async () => {
      if (!useMock) await api.deleteSite(site.site_id);
      setSites((current) => current.filter((item) => item.site_id !== site.site_id));
      setCompanies((current) =>
        current.map((company) =>
          company.company_id === site.company_id ? { ...company, site_count: Math.max((company.site_count ?? 1) - 1, 0) } : company
        )
      );
      if (selectedSite?.site_id === site.site_id) {
        setSelectedSite(null);
        setSelectedCamera(null);
        setCameras([]);
      }
      showToast("現場を削除しました");
    });
  };

  if (!user || screen === "login") {
    return (
      <main className="login-shell">
        <form className="login-panel" onSubmit={handleLogin}>
          <div>
            <p className="eyebrow">Camera Still Image Manager</p>
            <h1>インターネットカメラ静止画管理システム</h1>
          </div>
          <label>
            <span>ログインID</span>
            <input name="login_id" placeholder="ログインIDを入力" required autoFocus />
          </label>
          <label>
            <span>パスワード</span>
            <input name="password" type="password" placeholder="パスワードを入力" required />
          </label>
          {error && <div className="error-box">{error}</div>}
          <button className="primary" type="submit" disabled={loading}>
            {loading ? "読み込み中..." : "ログイン"}
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">インターネットカメラ静止画管理システム</p>
          <h1>{screenTitle(screen, editingCameraId)}</h1>
          <p className="breadcrumb">{breadcrumb}</p>
        </div>
        <div className="header-actions">
          <div className="user-chip">
            <strong>{user.user_name}</strong>
            <span>{roleLabel(user.role)}</span>
          </div>
          <button className="ghost" onClick={logout}>ログアウト</button>
        </div>
      </header>

      {toast && <div className="toast">{toast}</div>}
      {error && <div className="error-box page-error">{error}</div>}
      {loading && <div className="loading">読み込み中...</div>}

      {screen === "companySelect" && (
        <SelectionTable
          title="企業一覧"
          searchPlaceholder="企業名で検索"
          emptyMessage="表示可能な企業がありません"
          rows={companies}
          columns={[
            ["company_name", "企業名"],
            ["status", "状態"],
            ["site_count", "現場数"],
            ["camera_count", "カメラ数"]
          ]}
          onSearch={loadCompanies}
          onSelect={selectCompany}
          actionLabel="企業追加"
          onAction={() => setScreen("companyForm")}
          deleteLabel="企業削除"
          onDelete={deleteCompany}
        />
      )}

      {screen === "companyForm" && (
        <CompanyFormScreen
          key="companyForm"
          onSave={saveCompany}
          onCancel={goCompanySelect}
        />
      )}

      {screen === "siteSelect" && (
        <SelectionTable
          title="現場一覧"
          searchPlaceholder="現場名で検索"
          emptyMessage="表示可能な現場がありません"
          rows={sites}
          columns={[
            ["site_name", "現場名"],
            ["status", "状態"],
            ["camera_count", "カメラ数"],
            ["latest_captured_at", "最新取得日時"]
          ]}
          onSearch={(keyword) => loadSites(contextCompanyId, keyword)}
          onSelect={selectSite}
          backLabel={user.role === "system_admin" ? "企業選択へ戻る" : undefined}
          onBack={user.role === "system_admin" ? goCompanySelect : undefined}
          actionLabel="現場追加"
          onAction={() => setScreen("siteForm")}
          deleteLabel="現場削除"
          onDelete={deleteSite}
        />
      )}

      {screen === "siteForm" && (
        <SiteFormScreen
          key="siteForm"
          companies={companies}
          selectedCompany={selectedCompany}
          user={user}
          onSave={saveSite}
          onCancel={goSiteSelect}
        />
      )}

      {screen === "thumbnail" && (
        <ThumbnailScreen
          cameras={cameras}
          images={images}
          selectedCamera={selectedCamera}
          selectedDate={selectedDate}
          availableDates={availableDates}
          checkedCameraIds={checkedCameraIds}
          canManageCameras={canManageCameras}
          onSelectCamera={setSelectedCamera}
          onToggleCamera={(cameraId) =>
            setCheckedCameraIds((ids) => (ids.includes(cameraId) ? ids.filter((id) => id !== cameraId) : [...ids, cameraId]))
          }
          onDateChange={async (date) => {
            setSelectedDate(date);
            if (selectedCamera) setImages(useMock ? mock.thumbnails(selectedCamera.camera_id) : await api.thumbnails(selectedCamera.camera_id, date));
          }}
          onOpenImage={setActiveImage}
          onOpenSettings={() => setScreen("cameraSetting")}
          onOpenLatest={() => setScreen("multiLatest")}
          onBackSite={user.role === "system_admin" || user.role === "company_admin" ? goSiteSelect : undefined}
          onBackCompany={user.role === "system_admin" ? goCompanySelect : undefined}
        />
      )}

      {screen === "cameraSetting" && (
        <CameraSettingScreen
          cameras={cameras}
          onAdd={() => {
            setEditingCameraId(null);
            setScreen("cameraForm");
          }}
          onEdit={(camera) => {
            setEditingCameraId(camera.camera_id);
            setScreen("cameraForm");
          }}
          onDelete={deleteCamera}
          onTest={async (camera) => {
            await withLoading(async () => {
              if (!useMock) await api.testSavedCamera(camera.camera_id);
              showToast("接続テストに成功しました");
            });
          }}
          onBack={() => setScreen("thumbnail")}
        />
      )}

      {screen === "cameraForm" && (
        <CameraFormScreen
          camera={editingCameraId ? cameras.find((item) => item.camera_id === editingCameraId) ?? null : null}
          onSave={saveCamera}
          onCancel={() => setScreen("cameraSetting")}
          onTest={async (values) => {
            await withLoading(async () => {
              if (!useMock) await api.testConnection(values, contextCompanyId, contextSiteId);
              showToast("接続テストに成功しました");
            });
          }}
        />
      )}

      {screen === "multiLatest" && (
        <MultiLatestScreen
          latestImages={latestImages}
          onBack={() => setScreen("thumbnail")}
          onRefresh={async () => setLatestImages(useMock ? mock.latestBulk(checkedCameraIds).cameras : (await api.latestBulk(checkedCameraIds)).cameras)}
          onOpenImage={setActiveImage}
        />
      )}

      {!["companySelect", "companyForm", "siteSelect", "siteForm", "thumbnail", "cameraSetting", "cameraForm", "multiLatest"].includes(screen) && (
        <section className="content-panel">
          <div className="empty-state">画面を表示できませんでした</div>
        </section>
      )}

      {activeImage && <ImageModal image={activeImage} onClose={() => setActiveImage(null)} />}
    </main>
  );
}

function screenTitle(screen: Screen, editingCameraId: string | null) {
  const titles: Record<Screen, string> = {
    login: "ログイン",
    companySelect: "企業選択",
    companyForm: "企業追加",
    siteSelect: "現場選択",
    siteForm: "現場追加",
    thumbnail: "カメラ画像",
    cameraSetting: "カメラ設定",
    cameraForm: editingCameraId ? "カメラ再設定" : "カメラ追加",
    multiLatest: "複数カメラ最新画像"
  };
  return titles[screen];
}

function SelectionTable<T extends object>({
  title,
  searchPlaceholder,
  emptyMessage,
  rows,
  columns,
  onSearch,
  onSelect,
  backLabel,
  onBack,
  actionLabel,
  onAction,
  deleteLabel,
  onDelete
}: {
  title: string;
  searchPlaceholder: string;
  emptyMessage: string;
  rows: T[];
  columns: [string, string][];
  onSearch: (keyword: string) => void;
  onSelect: (row: T) => void;
  backLabel?: string;
  onBack?: () => void;
  actionLabel?: string;
  onAction?: () => void;
  deleteLabel?: string;
  onDelete?: (row: T) => void;
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selectedRow = rows[selectedIndex] ?? null;
  const readCell = (row: T, key: string) => (row as Record<string, unknown>)[key];
  return (
    <section className="content-panel">
      <div className="toolbar">
        <h2>{title}</h2>
        <div className="toolbar-actions">
          <input className="search" placeholder={searchPlaceholder} onChange={(event) => onSearch(event.target.value)} />
          {actionLabel && <button type="button" className="primary" onClick={onAction}>{actionLabel}</button>}
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>{columns.map(([, label]) => <th key={label}>{label}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                className={index === selectedIndex ? "selected" : ""}
                key={String(Object.values(row)[0])}
                onClick={() => setSelectedIndex(index)}
                onDoubleClick={() => onSelect(row)}
              >
                {columns.map(([key]) => (
                  <td key={key}>
                    {key.includes("at")
                      ? formatDateTime(readCell(row, key) as string | null)
                      : statusLabel(readCell(row, key) as string) === "-"
                        ? String(readCell(row, key) ?? "-")
                        : statusLabel(readCell(row, key) as string)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <div className="empty-state">{emptyMessage}</div>}
      </div>
      <div className="footer-actions">
        {backLabel && <button className="ghost" onClick={onBack}>{backLabel}</button>}
        {deleteLabel && onDelete && (
          <button className="ghost danger" disabled={!selectedRow} onClick={() => selectedRow && onDelete(selectedRow)}>
            {deleteLabel}
          </button>
        )}
        <button className="primary" disabled={!selectedRow} onClick={() => selectedRow && onSelect(selectedRow)}>
          選択
        </button>
      </div>
    </section>
  );
}

function CompanyFormScreen({
  onSave,
  onCancel
}: {
  onSave: (values: CompanyFormValues) => void;
  onCancel: () => void;
}) {
  const [values, setValues] = useState<CompanyFormValues>(emptyCompanyForm);
  const [formError, setFormError] = useState("");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const companyName = values.company_name.trim();
    if (!companyName) {
      setFormError("企業名は必須です");
      return;
    }
    onSave({ company_name: companyName });
  };

  return (
    <form className="form-panel narrow-form" onSubmit={submit}>
      <div className="form-grid single-column">
        <label>
          <span>企業名</span>
          <input
            value={values.company_name}
            maxLength={255}
            placeholder="例：A社"
            autoFocus
            onChange={(event) => setValues({ company_name: event.target.value })}
          />
        </label>
      </div>
      {formError && <div className="error-box">{formError}</div>}
      <div className="footer-actions">
        <button type="button" className="ghost" onClick={onCancel}>キャンセル</button>
        <button type="submit" className="primary">保存</button>
      </div>
    </form>
  );
}

function SiteFormScreen({
  companies,
  selectedCompany,
  user,
  onSave,
  onCancel
}: {
  companies: Company[];
  selectedCompany: Company | null;
  user: User;
  onSave: (values: SiteFormValues) => void;
  onCancel: () => void;
}) {
  const initialCompanyId = selectedCompany?.company_id ?? user.company_id ?? companies[0]?.company_id ?? "";
  const [values, setValues] = useState<SiteFormValues>({ ...emptySiteForm, company_id: initialCompanyId });
  const [formError, setFormError] = useState("");
  const canChooseCompany = user.role === "system_admin";

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const siteName = values.site_name.trim();
    if (!values.company_id) {
      setFormError("所属企業は必須です");
      return;
    }
    if (!siteName) {
      setFormError("現場名は必須です");
      return;
    }
    onSave({ company_id: values.company_id, site_name: siteName });
  };

  return (
    <form className="form-panel narrow-form" onSubmit={submit}>
      <div className="form-grid single-column">
        <label>
          <span>所属企業</span>
          {canChooseCompany ? (
            <select value={values.company_id} onChange={(event) => setValues((current) => ({ ...current, company_id: event.target.value }))}>
              <option value="" disabled>企業を選択</option>
              {companies.map((company) => (
                <option key={company.company_id} value={company.company_id}>{company.company_name}</option>
              ))}
            </select>
          ) : (
            <input value={companies.find((company) => company.company_id === values.company_id)?.company_name ?? user.company_id ?? ""} disabled />
          )}
        </label>
        <label>
          <span>現場名</span>
          <input
            value={values.site_name}
            maxLength={255}
            placeholder="例：札幌第1現場"
            autoFocus
            onChange={(event) => setValues((current) => ({ ...current, site_name: event.target.value }))}
          />
        </label>
      </div>
      {formError && <div className="error-box">{formError}</div>}
      <div className="footer-actions">
        <button type="button" className="ghost" onClick={onCancel}>キャンセル</button>
        <button type="submit" className="primary">保存</button>
      </div>
    </form>
  );
}

function ThumbnailScreen(props: {
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

function CameraSettingScreen({
  cameras,
  onAdd,
  onEdit,
  onDelete,
  onTest,
  onBack
}: {
  cameras: Camera[];
  onAdd: () => void;
  onEdit: (camera: Camera) => void;
  onDelete: (cameraId: string) => void;
  onTest: (camera: Camera) => void;
  onBack: () => void;
}) {
  return (
    <section className="content-panel">
      <div className="toolbar">
        <h2>カメラ一覧</h2>
        <button className="primary" onClick={onAdd}>カメラ追加</button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>カメラ名</th>
              <th>アドレス</th>
              <th>認証方式</th>
              <th>取得間隔</th>
              <th>保存画質</th>
              <th>保存期間</th>
              <th>取得状態</th>
              <th>最終取得日時</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {cameras.map((camera) => (
              <tr key={camera.camera_id} onDoubleClick={() => onEdit(camera)}>
                <td>{camera.camera_name}</td>
                <td>{camera.address ?? "-"}</td>
                <td>BASIC</td>
                <td>{camera.capture_interval_minutes}分</td>
                <td>{qualityLabels[camera.image_quality]}</td>
                <td>{camera.retention_days ?? "-"}日</td>
                <td><span className={`status ${camera.last_capture_status ?? "not_yet"}`}>{statusLabel(camera.last_capture_status)}</span></td>
                <td>{formatDateTime(camera.last_capture_at)}</td>
                <td className="row-actions">
                  <button onClick={() => onEdit(camera)}>編集</button>
                  <button onClick={() => onDelete(camera.camera_id)}>削除</button>
                  <button onClick={() => onTest(camera)}>接続テスト</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {cameras.length === 0 && <div className="empty-state">登録済みカメラがありません</div>}
      </div>
      <div className="footer-actions">
        <button className="ghost" onClick={onBack}>戻る</button>
      </div>
    </section>
  );
}

function CameraFormScreen({
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
    ...emptyForm,
    camera_name: camera?.camera_name ?? "",
    address: camera?.address ?? "",
    login_id: camera?.login_id ?? "",
    capture_interval_minutes: camera?.capture_interval_minutes ?? 1,
    image_quality: camera?.image_quality ?? "FullHD",
    retention_days: camera?.retention_days ?? 30
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

function MultiLatestScreen({
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

function ImageModal({ image, onClose }: { image: CapturedImage | LatestImage; onClose: () => void }) {
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

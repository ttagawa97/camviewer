import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "./api";
import { AppErrorBoundary } from "./components/AppErrorBoundary";
import { ImageModal } from "./components/ImageModal";
import { useCameras } from "./hooks/useCameras";
import { useCompanies } from "./hooks/useCompanies";
import { useImages } from "./hooks/useImages";
import { useOperationStatus } from "./hooks/useOperationStatus";
import { useSites } from "./hooks/useSites";
import { useUsers } from "./hooks/useUsers";
import { mock, mockLogin, roleLabel } from "./mock";
import { CameraFormScreen } from "./screens/CameraFormScreen";
import { CameraSettingScreen } from "./screens/CameraSettingScreen";
import { CompanyFormScreen } from "./screens/CompanyFormScreen";
import { CompanySelectScreen } from "./screens/CompanySelectScreen";
import { LoginScreen } from "./screens/LoginScreen";
import { MultiLatestScreen } from "./screens/MultiLatestScreen";
import { SiteFormScreen } from "./screens/SiteFormScreen";
import { SiteSelectScreen } from "./screens/SiteSelectScreen";
import { ThumbnailScreen } from "./screens/ThumbnailScreen";
import { UserManagementScreen } from "./screens/UserManagementScreen";
import { initialScreenFor, loadStoredUser, loadStoredView, storeUser, storeView } from "./storage";
import type {
  Camera,
  CapturedImage,
  Company,
  LatestImage,
  Screen,
  Site,
  User
} from "./types";

type UserManagementContext =
  | { scope: "company"; company: Company | null; site: null }
  | { scope: "site"; company: Company | null; site: Site };

export default function App() {
  return (
    <AppErrorBoundary>
      <AppContent />
    </AppErrorBoundary>
  );
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
  const [activeImage, setActiveImage] = useState<CapturedImage | LatestImage | null>(null);
  const [editingCameraId, setEditingCameraId] = useState<string | null>(() => initialStoredView?.editingCameraId ?? null);
  const [userManagementContext, setUserManagementContext] = useState<UserManagementContext | null>(
    () => initialStoredView?.userManagementContext as UserManagementContext | null ?? null
  );
  const { toast, error, loading, withLoading, showToast } = useOperationStatus();

  const canManageCameras = user?.role === "system_admin" || user?.role === "company_admin" || user?.role === "site_admin";
  const contextCompanyId = selectedCompany?.company_id ?? user?.company_id ?? null;
  const contextSiteId = selectedSite?.site_id ?? user?.site_id ?? null;

  const onCompanyCreated = useCallback(() => {
    setSelectedCompany(null);
    setSelectedSite(null);
    setScreen("companySelect");
  }, []);

  const onSelectedCompanyDeleted = useCallback(() => {
    setSelectedCompany(null);
    setSelectedSite(null);
    setSelectedCamera(null);
    setSites([]);
    setCameras([]);
  }, []);

  const onCameraSaved = useCallback(() => {
    setScreen("cameraSetting");
    setEditingCameraId(null);
  }, []);

  const {
    companies,
    setCompanies,
    loadCompanies,
    saveCompany,
    deleteCompany
  } = useCompanies({
    useMock,
    withLoading,
    showToast,
    selectedCompany,
    onCreated: onCompanyCreated,
    onDeletedSelected: onSelectedCompanyDeleted
  });

  const {
    cameras,
    setCameras,
    loadCameras,
    saveCamera,
    deleteCamera,
    testSavedCamera,
    testCameraValues
  } = useCameras({
    useMock,
    withLoading,
    showToast,
    contextCompanyId,
    contextSiteId,
    editingCameraId,
    setSelectedCamera,
    onSaved: onCameraSaved
  });

  const onSiteCreated = useCallback(() => {
    setSelectedSite(null);
    setScreen("siteSelect");
  }, []);

  const onSelectedSiteDeleted = useCallback(() => {
    setSelectedSite(null);
    setSelectedCamera(null);
    setCameras([]);
  }, [setCameras]);

  const {
    sites,
    setSites,
    loadSites,
    saveSite,
    deleteSite
  } = useSites({
    useMock,
    withLoading,
    showToast,
    selectedSite,
    setCompanies,
    onCreated: onSiteCreated,
    onDeletedSelected: onSelectedSiteDeleted
  });

  const {
    availableDates,
    selectedDate,
    images,
    latestImages,
    loadDatesAndImages,
    changeDate,
    refreshLatestImages
  } = useImages({
    useMock,
    withLoading,
    contextCompanyId,
    contextSiteId,
    selectedCamera,
    initialSelectedDate: initialStoredView?.selectedDate ?? ""
  });

  const { managedUsers, loadUsers, saveUser, deleteUser } = useUsers({
    useMock,
    withLoading,
    showToast
  });

  const selectedCompanyName = selectedCompany?.company_name ?? (user?.company_id ? companies.find((item) => item.company_id === user.company_id)?.company_name : "");
  const selectedSiteName = selectedSite?.site_name ?? (user?.site_id ? sites.find((item) => item.site_id === user.site_id)?.site_name : "");

  const breadcrumb = useMemo(() => {
    const items: string[] = [];
    if (screen === "companySelect") return "企業選択";
    if (screen === "companyForm") return "企業選択 > 企業追加";

    if (selectedCompanyName) items.push(selectedCompanyName);
    if (screen === "siteSelect") items.push("現場選択");
    if (screen === "siteForm") items.push("現場選択", "現場追加");
    if (screen === "userManagement") items.push(userManagementContext?.scope === "site" ? "現場選択" : "企業選択", "ユーザー管理");

    if (["thumbnail", "cameraSetting", "cameraForm", "multiLatest"].includes(screen) && selectedSiteName) items.push(selectedSiteName);
    if (screen === "thumbnail") items.push("カメラ画像");
    if (screen === "cameraSetting") items.push("カメラ画像", "カメラ設定");
    if (screen === "cameraForm") items.push("カメラ画像", "カメラ設定", editingCameraId ? "カメラ再設定" : "カメラ追加");
    if (screen === "multiLatest") items.push("カメラ画像", "複数カメラ最新画像");
    return items.join(" > ");
  }, [editingCameraId, screen, selectedCompanyName, selectedSiteName, userManagementContext?.scope]);

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
    setSites([]);
    setCameras([]);
    setScreen("siteSelect");
  };

  const openCompanyUserManagement = (company: Company) => {
    setUserManagementContext({ scope: "company", company: user?.role === "system_admin" ? null : company, site: null });
    setScreen("userManagement");
  };

  const openSiteUserManagement = (site: Site) => {
    const company = selectedCompany ?? companies.find((item) => item.company_id === site.company_id) ?? null;
    setUserManagementContext({ scope: "site", company, site });
    setScreen("userManagement");
  };

  const closeUserManagement = () => {
    setScreen(userManagementContext?.scope === "site" ? "siteSelect" : "companySelect");
    setUserManagementContext(null);
  };

  const selectSite = (site: Site) => {
    setSelectedSite(site);
    setSelectedCamera(null);
    setCheckedCameraIds([]);
    setScreen("thumbnail");
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
      userManagementContext,
      checkedCameraIds,
      selectedDate,
      editingCameraId
    });
  }, [checkedCameraIds, editingCameraId, screen, selectedCamera, selectedCompany, selectedDate, selectedSite, user, userManagementContext]);

  useEffect(() => {
    if (!authChecked || !user) return;
    if (screen === "companySelect" || screen === "siteForm") void loadCompanies();
    if (screen === "siteSelect" || screen === "thumbnail" || screen === "cameraSetting" || screen === "cameraForm") void loadSites(contextCompanyId);
    if (screen === "thumbnail" || screen === "cameraSetting" || screen === "cameraForm") void loadCameras();
  }, [authChecked, contextCompanyId, loadCameras, loadCompanies, loadSites, screen, user]);

  useEffect(() => {
    if (!authChecked || !user || screen !== "userManagement" || !userManagementContext) return;
    const companyId = userManagementContext.scope === "site" ? userManagementContext.site.company_id : userManagementContext.company?.company_id ?? null;
    const siteId = userManagementContext.scope === "site" ? userManagementContext.site.site_id : null;
    void loadUsers(companyId, siteId);
    if (userManagementContext.scope === "company") {
      void loadCompanies();
      void loadSites(companyId);
    }
  }, [authChecked, loadCompanies, loadSites, loadUsers, screen, user, userManagementContext]);

  useEffect(() => {
    if (screen === "thumbnail") void loadDatesAndImages(selectedCamera);
  }, [loadDatesAndImages, screen, selectedCamera]);

  useEffect(() => {
    if (screen !== "multiLatest" || checkedCameraIds.length === 0) return;
    const load = async () => refreshLatestImages(checkedCameraIds);
    void load();
    const timer = window.setInterval(load, 60000);
    return () => window.clearInterval(timer);
  }, [checkedCameraIds, refreshLatestImages, screen]);

  const handleLogin = async (loginId: string, password: string) => {
    authCheckVersion.current += 1;
    setAuthChecked(true);

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

  if (!user || screen === "login") {
    return <LoginScreen error={error} loading={loading} onLogin={handleLogin} />;
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
        <CompanySelectScreen
          companies={companies}
          onSearch={loadCompanies}
          onSelect={selectCompany}
          onAdd={() => setScreen("companyForm")}
          onManageUsers={openCompanyUserManagement}
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
        <SiteSelectScreen
          sites={sites}
          canBackToCompany={user.role === "system_admin"}
          onSearch={(keyword) => loadSites(contextCompanyId, keyword)}
          onSelect={selectSite}
          onBackCompany={goCompanySelect}
          onAdd={() => setScreen("siteForm")}
          onManageUsers={openSiteUserManagement}
          onDelete={deleteSite}
        />
      )}

      {screen === "userManagement" && userManagementContext && (
        <UserManagementScreen
          title="ユーザー管理"
          company={userManagementContext.company}
          site={userManagementContext.site}
          companies={companies}
          sites={sites}
          users={managedUsers}
          allowedRoles={userManagementContext.scope === "company" ? ["system_admin", "company_admin", "site_admin", "general_user"] : ["site_admin", "general_user"]}
          onSave={saveUser}
          onDelete={deleteUser}
          onBack={closeUserManagement}
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
          onDateChange={changeDate}
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
          onTest={testSavedCamera}
          onBack={() => setScreen("thumbnail")}
        />
      )}

      {screen === "cameraForm" && (
        <CameraFormScreen
          camera={editingCameraId ? cameras.find((item) => item.camera_id === editingCameraId) ?? null : null}
          onSave={saveCamera}
          onCancel={() => setScreen("cameraSetting")}
          onTest={testCameraValues}
        />
      )}

      {screen === "multiLatest" && (
        <MultiLatestScreen
          latestImages={latestImages}
          onBack={() => setScreen("thumbnail")}
          onRefresh={() => refreshLatestImages(checkedCameraIds)}
          onOpenImage={setActiveImage}
        />
      )}

      {!["companySelect", "companyForm", "siteSelect", "siteForm", "userManagement", "thumbnail", "cameraSetting", "cameraForm", "multiLatest"].includes(screen) && (
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
    userManagement: "ユーザー管理",
    thumbnail: "カメラ画像",
    cameraSetting: "カメラ設定",
    cameraForm: editingCameraId ? "カメラ再設定" : "カメラ追加",
    multiLatest: "複数カメラ最新画像"
  };
  return titles[screen];
}

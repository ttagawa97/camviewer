import { Dispatch, SetStateAction, useCallback, useRef, useState } from "react";
import { api } from "../api";
import { mock } from "../mock";
import type { Company, Site, SiteFormValues } from "../types";

export function useSites({
  useMock,
  withLoading,
  showToast,
  selectedSite,
  setCompanies,
  onCreated,
  onDeletedSelected
}: {
  useMock: boolean;
  withLoading: (task: () => Promise<void>) => Promise<void>;
  showToast: (message: string) => void;
  selectedSite: Site | null;
  setCompanies: Dispatch<SetStateAction<Company[]>>;
  onCreated: () => void;
  onDeletedSelected: () => void;
}) {
  const [sites, setSites] = useState<Site[]>([]);
  const loadVersion = useRef(0);

  const loadSites = useCallback(
    (companyId?: string | null, keyword = "") =>
      withLoading(async () => {
        const version = ++loadVersion.current;
        const rows = useMock ? mock.sites(companyId, keyword) : await api.sites(companyId ?? undefined, keyword);
        if (version !== loadVersion.current) return;
        setSites(companyId ? rows.filter((site) => site.company_id === companyId) : rows);
      }),
    [useMock, withLoading]
  );

  const saveSite = useCallback(
    async (values: SiteFormValues) => {
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
        showToast("現場を登録しました");
        onCreated();
      });
    },
    [onCreated, setCompanies, showToast, useMock, withLoading]
  );

  const deleteSite = useCallback(
    async (site: Site) => {
      if (!window.confirm(`${site.site_name} を削除します。\n配下のカメラ、撮影済みデータもすべて削除されます。\nよろしいですか？`)) return;
      await withLoading(async () => {
        if (!useMock) await api.deleteSite(site.site_id);
        setSites((current) => current.filter((item) => item.site_id !== site.site_id));
        setCompanies((current) =>
          current.map((company) =>
            company.company_id === site.company_id ? { ...company, site_count: Math.max((company.site_count ?? 1) - 1, 0) } : company
          )
        );
        if (selectedSite?.site_id === site.site_id) onDeletedSelected();
        showToast("現場を削除しました");
      });
    },
    [onDeletedSelected, selectedSite?.site_id, setCompanies, showToast, useMock, withLoading]
  );

  return { sites, setSites, loadSites, saveSite, deleteSite };
}

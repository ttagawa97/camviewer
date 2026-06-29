import { useCallback, useRef, useState } from "react";
import { api } from "../api";
import { mock } from "../mock";
import type { Company, CompanyFormValues } from "../types";

export function useCompanies({
  useMock,
  withLoading,
  showToast,
  selectedCompany,
  onCreated,
  onDeletedSelected
}: {
  useMock: boolean;
  withLoading: (task: () => Promise<void>) => Promise<void>;
  showToast: (message: string) => void;
  selectedCompany: Company | null;
  onCreated: () => void;
  onDeletedSelected: () => void;
}) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const loadVersion = useRef(0);

  const loadCompanies = useCallback(
    (keyword = "") =>
      withLoading(async () => {
        const version = ++loadVersion.current;
        const rows = useMock ? mock.companies(keyword) : await api.companies(keyword);
        if (version !== loadVersion.current) return;
        const normalizedKeyword = keyword.trim().toLowerCase();
        setCompanies(
          normalizedKeyword
            ? rows.filter((company) => company.company_name.toLowerCase().includes(normalizedKeyword))
            : rows
        );
      }),
    [useMock, withLoading]
  );

  const saveCompany = useCallback(
    async (values: CompanyFormValues) => {
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
        showToast("企業を登録しました");
        onCreated();
      });
    },
    [onCreated, showToast, useMock, withLoading]
  );

  const deleteCompany = useCallback(
    async (company: Company) => {
      if (!window.confirm(`${company.company_name} を削除します。\n配下の現場、カメラ、撮影済みデータもすべて削除されます。\nよろしいですか？`)) return;
      await withLoading(async () => {
        if (!useMock) await api.deleteCompany(company.company_id);
        setCompanies((current) => current.filter((item) => item.company_id !== company.company_id));
        if (selectedCompany?.company_id === company.company_id) onDeletedSelected();
        showToast("企業を削除しました");
      });
    },
    [onDeletedSelected, selectedCompany?.company_id, showToast, useMock, withLoading]
  );

  return { companies, setCompanies, loadCompanies, saveCompany, deleteCompany };
}

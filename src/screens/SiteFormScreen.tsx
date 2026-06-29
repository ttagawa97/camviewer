import { FormEvent, useState } from "react";
import { emptySiteForm } from "../constants";
import type { Company, SiteFormValues, User } from "../types";

export function SiteFormScreen({
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

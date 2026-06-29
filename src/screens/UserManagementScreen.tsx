import { FormEvent, useEffect, useMemo, useState } from "react";
import { roleLabel } from "../mock";
import type { Company, Role, Site, User, UserFormValues } from "../types";

const roleOptions: Role[] = ["system_admin", "company_admin", "site_admin", "general_user"];

export function UserManagementScreen({
  title,
  company,
  site,
  companies,
  sites,
  users,
  allowedRoles,
  onSave,
  onDelete,
  onBack
}: {
  title: string;
  company: Company | null;
  site: Site | null;
  companies: Company[];
  sites: Site[];
  users: User[];
  allowedRoles: Role[];
  onSave: (values: UserFormValues, editingUserId?: string | null) => void;
  onDelete: (user: User) => void;
  onBack: () => void;
}) {
  const availableRoles = roleOptions.filter((role) => allowedRoles.includes(role));
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [values, setValues] = useState<UserFormValues>(() => createInitialValues(availableRoles[0] ?? "general_user", company, site));
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!editingUser) setValues(createInitialValues(availableRoles[0] ?? "general_user", company, site));
  }, [company, editingUser, site]);

  const selectableCompanies = useMemo(() => (company ? [company] : companies), [companies, company]);
  const selectableSites = useMemo(
    () => (site ? [site] : sites.filter((item) => !values.company_id || item.company_id === values.company_id)),
    [site, sites, values.company_id]
  );

  const updateRole = (role: Role) => {
    const companyId = role === "system_admin" ? null : values.company_id ?? company?.company_id ?? selectableCompanies[0]?.company_id ?? null;
    const nextSite = companyId ? sites.find((item) => item.company_id === companyId) : null;
    setValues((current) => ({
      ...current,
      role,
      company_id: companyId,
      site_id: role === "site_admin" || role === "general_user" ? site?.site_id ?? nextSite?.site_id ?? null : null
    }));
  };

  const updateCompany = (companyId: string) => {
    const nextSite = sites.find((item) => item.company_id === companyId);
    setValues((current) => ({
      ...current,
      company_id: companyId || null,
      site_id: current.role === "site_admin" || current.role === "general_user" ? nextSite?.site_id ?? null : null
    }));
  };

  const startEdit = (user: User) => {
    setEditingUser(user);
    setFormError("");
    setValues({
      login_id: user.login_id,
      user_name: user.user_name,
      password: "",
      role: user.role,
      company_id: user.company_id,
      site_id: user.site_id
    });
  };

  const resetForm = () => {
    setEditingUser(null);
    setFormError("");
    setValues(createInitialValues(availableRoles[0] ?? "general_user", company, site));
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!values.login_id.trim()) {
      setFormError("ログインIDは必須です");
      return;
    }
    if (!values.user_name.trim()) {
      setFormError("ユーザー名は必須です");
      return;
    }
    if (!editingUser && !values.password.trim()) {
      setFormError("パスワードは必須です");
      return;
    }
    if (values.role !== "system_admin" && !values.company_id) {
      setFormError("所属企業は必須です");
      return;
    }
    if ((values.role === "site_admin" || values.role === "general_user") && !values.site_id) {
      setFormError("所属現場は必須です");
      return;
    }
    onSave(values, editingUser?.user_id ?? null);
    resetForm();
  };

  return (
    <section className="content-panel user-management">
      <div className="toolbar">
        <div>
          <h2>{title}</h2>
          <p>{site?.site_name ?? company?.company_name ?? "全体"}</p>
        </div>
        <button className="ghost" onClick={onBack}>戻る</button>
      </div>

      <div className="user-management-layout">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ログインID</th>
                <th>ユーザー名</th>
                <th>権限</th>
                <th>所属現場</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.user_id}>
                  <td>{user.login_id}</td>
                  <td>{user.user_name}</td>
                  <td>{roleLabel(user.role)}</td>
                  <td>{sites.find((item) => item.site_id === user.site_id)?.site_name ?? "-"}</td>
                  <td className="row-actions">
                    <button onClick={() => startEdit(user)}>編集</button>
                    <button className="danger" onClick={() => onDelete(user)}>削除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && <div className="empty-state">表示対象のユーザーがありません</div>}
        </div>

        <form className="user-form" onSubmit={submit}>
          <h3>{editingUser ? "ユーザー編集" : "ユーザー追加"}</h3>
          <label>
            <span>ログインID</span>
            <input value={values.login_id} maxLength={150} onChange={(event) => setValues((current) => ({ ...current, login_id: event.target.value }))} />
          </label>
          <label>
            <span>ユーザー名</span>
            <input value={values.user_name} maxLength={150} onChange={(event) => setValues((current) => ({ ...current, user_name: event.target.value }))} />
          </label>
          <label>
            <span>パスワード</span>
            <input
              value={values.password}
              type="password"
              maxLength={128}
              placeholder={editingUser ? "変更する場合のみ入力" : ""}
              onChange={(event) => setValues((current) => ({ ...current, password: event.target.value }))}
            />
          </label>
          <label>
            <span>権限</span>
            <select value={values.role} onChange={(event) => updateRole(event.target.value as Role)}>
              {availableRoles.map((role) => <option key={role} value={role}>{roleLabel(role)}</option>)}
            </select>
          </label>
          {values.role !== "system_admin" && (
            <label>
              <span>所属企業</span>
              <select value={values.company_id ?? ""} disabled={Boolean(company)} onChange={(event) => updateCompany(event.target.value)}>
                <option value="" disabled>企業を選択</option>
                {selectableCompanies.map((item) => <option key={item.company_id} value={item.company_id}>{item.company_name}</option>)}
              </select>
            </label>
          )}
          {(values.role === "site_admin" || values.role === "general_user") && (
            <label>
              <span>所属現場</span>
              <select
                value={values.site_id ?? ""}
                disabled={Boolean(site)}
                onChange={(event) => setValues((current) => ({ ...current, site_id: event.target.value || null }))}
              >
                <option value="" disabled>現場を選択</option>
                {selectableSites.map((item) => <option key={item.site_id} value={item.site_id}>{item.site_name}</option>)}
              </select>
            </label>
          )}
          {formError && <div className="error-box">{formError}</div>}
          <div className="footer-actions">
            {editingUser && <button type="button" className="ghost" onClick={resetForm}>新規入力</button>}
            <button type="submit" className="primary">{editingUser ? "更新" : "追加"}</button>
          </div>
        </form>
      </div>
    </section>
  );
}

function createInitialValues(role: Role, company: Company | null, site: Site | null): UserFormValues {
  return {
    login_id: "",
    user_name: "",
    password: "",
    role,
    company_id: role === "system_admin" ? null : company?.company_id ?? null,
    site_id: role === "site_admin" || role === "general_user" ? site?.site_id ?? null : null
  };
}

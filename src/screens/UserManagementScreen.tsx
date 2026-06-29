import { FormEvent, useEffect, useMemo, useState } from "react";
import { roleLabel } from "../mock";
import type { Company, Role, Site, User, UserFormValues } from "../types";

const roleOptions: Role[] = ["system_admin", "company_admin", "site_admin", "general_user"];
type FormValueSetter = (updater: (current: UserFormValues) => UserFormValues) => void;

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
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [addValues, setAddValues] = useState<UserFormValues>(() => createInitialValues(availableRoles[0] ?? "general_user", company, site));
  const [editValues, setEditValues] = useState<UserFormValues | null>(null);
  const [addError, setAddError] = useState("");
  const [editError, setEditError] = useState("");

  useEffect(() => {
    setAddValues(createInitialValues(availableRoles[0] ?? "general_user", company, site));
    setAddError("");
  }, [company, site]);

  const selectableCompanies = useMemo(() => (company ? [company] : companies), [companies, company]);

  const getSelectableSites = (formValues: UserFormValues) =>
    site ? [site] : sites.filter((item) => !formValues.company_id || item.company_id === formValues.company_id);

  const updateRole = (role: Role, setFormValues: FormValueSetter) => {
    setFormValues((current) => {
      const companyId = role === "system_admin" ? null : current.company_id ?? company?.company_id ?? selectableCompanies[0]?.company_id ?? null;
      const nextSite = companyId ? sites.find((item) => item.company_id === companyId) : null;
      return {
        ...current,
        role,
        company_id: companyId,
        site_id: role === "site_admin" || role === "general_user" ? site?.site_id ?? nextSite?.site_id ?? null : null
      };
    });
  };

  const updateCompany = (companyId: string, setFormValues: FormValueSetter) => {
    const nextSite = sites.find((item) => item.company_id === companyId);
    setFormValues((current) => ({
      ...current,
      company_id: companyId || null,
      site_id: current.role === "site_admin" || current.role === "general_user" ? nextSite?.site_id ?? null : null
    }));
  };

  const startAdd = () => {
    setAddValues(createInitialValues(availableRoles[0] ?? "general_user", company, site));
    setAddError("");
    setIsAddOpen(true);
  };

  const closeAdd = () => {
    setIsAddOpen(false);
    setAddError("");
  };

  const closeEdit = () => {
    setEditingUser(null);
    setEditValues(null);
    setEditError("");
  };

  const startEdit = (user: User) => {
    setEditingUser(user);
    setEditError("");
    setEditValues({
      login_id: user.login_id,
      user_name: user.user_name,
      password: "",
      role: user.role,
      company_id: user.company_id,
      site_id: user.site_id
    });
  };

  const confirmDelete = () => {
    if (!deletingUser) return;
    onDelete(deletingUser);
    setDeletingUser(null);
  };

  const submit = (
    event: FormEvent,
    formValues: UserFormValues,
    editingUserId: string | null,
    setError: (message: string) => void,
    onSuccess: () => void
  ) => {
    event.preventDefault();
    if (!formValues.login_id.trim()) {
      setError("ログインIDは必須です");
      return;
    }
    if (!formValues.user_name.trim()) {
      setError("ユーザー名は必須です");
      return;
    }
    if (!editingUserId && !formValues.password.trim()) {
      setError("パスワードは必須です");
      return;
    }
    if (formValues.role !== "system_admin" && !formValues.company_id) {
      setError("所属企業は必須です");
      return;
    }
    if ((formValues.role === "site_admin" || formValues.role === "general_user") && !formValues.site_id) {
      setError("所属現場は必須です");
      return;
    }
    onSave(formValues, editingUserId);
    onSuccess();
  };

  return (
    <section className="content-panel user-management">
      <div className="toolbar">
        <div>
          <h2>{title}</h2>
          <p>{site?.site_name ?? company?.company_name ?? "全体"}</p>
        </div>
        <div className="toolbar-actions">
          <button className="primary" onClick={startAdd}>ユーザー追加</button>
          <button className="ghost" onClick={onBack}>戻る</button>
        </div>
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
                    <button className="danger" onClick={() => setDeletingUser(user)}>削除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && <div className="empty-state">表示対象のユーザーがありません</div>}
        </div>
      </div>

      {isAddOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="user-add-title">
          <div className="user-edit-modal">
            <UserForm
              title="ユーザー追加"
              titleId="user-add-title"
              values={addValues}
              setValues={setAddValues}
              availableRoles={availableRoles}
              selectableCompanies={selectableCompanies}
              selectableSites={getSelectableSites(addValues)}
              companyFixed={Boolean(company)}
              siteFixed={Boolean(site)}
              error={addError}
              submitLabel="追加"
              onRoleChange={(role) => updateRole(role, setAddValues)}
              onCompanyChange={(companyId) => updateCompany(companyId, setAddValues)}
              onCancel={closeAdd}
              cancelLabel="閉じる"
              onSubmit={(event) => submit(event, addValues, null, setAddError, closeAdd)}
            />
          </div>
        </div>
      )}

      {editingUser && editValues && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="user-edit-title">
          <div className="user-edit-modal">
            <UserForm
              title="ユーザー編集"
              titleId="user-edit-title"
              values={editValues}
              setValues={(updater) => setEditValues((current) => current ? updater(current) : current)}
              availableRoles={availableRoles}
              selectableCompanies={selectableCompanies}
              selectableSites={getSelectableSites(editValues)}
              companyFixed={Boolean(company)}
              siteFixed={Boolean(site)}
              error={editError}
              submitLabel="更新"
              passwordPlaceholder="変更する場合のみ入力"
              onRoleChange={(role) => updateRole(role, (updater) => setEditValues((current) => current ? updater(current) : current))}
              onCompanyChange={(companyId) => updateCompany(companyId, (updater) => setEditValues((current) => current ? updater(current) : current))}
              onCancel={closeEdit}
              cancelLabel="閉じる"
              onSubmit={(event) => submit(event, editValues, editingUser.user_id, setEditError, closeEdit)}
            />
          </div>
        </div>
      )}

      {deletingUser && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="user-delete-title">
          <div className="confirm-modal">
            <h3 id="user-delete-title">ユーザー削除</h3>
            <p>
              {deletingUser.user_name}（{deletingUser.login_id}）を削除します。よろしいですか？
            </p>
            <div className="footer-actions">
              <button type="button" className="ghost" onClick={() => setDeletingUser(null)}>閉じる</button>
              <button type="button" className="danger" onClick={confirmDelete}>削除</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function UserForm({
  title,
  titleId,
  values,
  setValues,
  availableRoles,
  selectableCompanies,
  selectableSites,
  companyFixed,
  siteFixed,
  error,
  submitLabel,
  passwordPlaceholder = "",
  cancelLabel,
  onRoleChange,
  onCompanyChange,
  onCancel,
  onSubmit
}: {
  title: string;
  titleId?: string;
  values: UserFormValues;
  setValues: FormValueSetter;
  availableRoles: Role[];
  selectableCompanies: Company[];
  selectableSites: Site[];
  companyFixed: boolean;
  siteFixed: boolean;
  error: string;
  submitLabel: string;
  passwordPlaceholder?: string;
  cancelLabel: string;
  onRoleChange: (role: Role) => void;
  onCompanyChange: (companyId: string) => void;
  onCancel: () => void;
  onSubmit: (event: FormEvent) => void;
}) {
  return (
    <form className="user-form" onSubmit={onSubmit}>
      <h3 id={titleId}>{title}</h3>
      <label>
        <span>ユーザー名</span>
        <input value={values.user_name} maxLength={150} onChange={(event) => setValues((current) => ({ ...current, user_name: event.target.value }))} />
      </label>
      <label>
        <span>ログインID</span>
        <input value={values.login_id} maxLength={150} onChange={(event) => setValues((current) => ({ ...current, login_id: event.target.value }))} />
      </label>
      <label>
        <span>パスワード</span>
        <input
          value={values.password}
          type="password"
          maxLength={128}
          placeholder={passwordPlaceholder}
          onChange={(event) => setValues((current) => ({ ...current, password: event.target.value }))}
        />
      </label>
      <label>
        <span>権限</span>
        <select value={values.role} onChange={(event) => onRoleChange(event.target.value as Role)}>
          {availableRoles.map((role) => <option key={role} value={role}>{roleLabel(role)}</option>)}
        </select>
      </label>
      {values.role !== "system_admin" && (
        <label>
          <span>所属企業</span>
          <select value={values.company_id ?? ""} disabled={companyFixed} onChange={(event) => onCompanyChange(event.target.value)}>
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
            disabled={siteFixed}
            onChange={(event) => setValues((current) => ({ ...current, site_id: event.target.value || null }))}
          >
            <option value="" disabled>現場を選択</option>
            {selectableSites.map((item) => <option key={item.site_id} value={item.site_id}>{item.site_name}</option>)}
          </select>
        </label>
      )}
      {error && <div className="error-box">{error}</div>}
      <div className="footer-actions">
        <button type="button" className="ghost" onClick={onCancel}>{cancelLabel}</button>
        <button type="submit" className="primary">{submitLabel}</button>
      </div>
    </form>
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

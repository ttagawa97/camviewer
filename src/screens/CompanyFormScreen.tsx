import { FormEvent, useState } from "react";
import { emptyCompanyForm } from "../constants";
import type { CompanyFormValues } from "../types";

export function CompanyFormScreen({
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

import { FormEvent } from "react";

export function LoginScreen({
  error,
  loading,
  onLogin
}: {
  error: string;
  loading: boolean;
  onLogin: (loginId: string, password: string) => void;
}) {
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onLogin(String(form.get("login_id") ?? ""), String(form.get("password") ?? ""));
  };

  return (
    <main className="login-shell">
      <form className="login-panel" onSubmit={submit}>
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

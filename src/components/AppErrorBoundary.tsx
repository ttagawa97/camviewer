import { Component, ReactNode } from "react";

export class AppErrorBoundary extends Component<{ children: ReactNode }, { message: string }> {
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

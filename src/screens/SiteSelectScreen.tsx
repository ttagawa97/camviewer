import { SelectionTable } from "../components/SelectionTable";
import type { Site } from "../types";

export function SiteSelectScreen({
  sites,
  canBackToCompany,
  onSearch,
  onSelect,
  onBackCompany,
  onAdd,
  onDelete
}: {
  sites: Site[];
  canBackToCompany: boolean;
  onSearch: (keyword: string) => void;
  onSelect: (site: Site) => void;
  onBackCompany: () => void;
  onAdd: () => void;
  onDelete: (site: Site) => void;
}) {
  return (
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
      onSearch={onSearch}
      onSelect={onSelect}
      backLabel={canBackToCompany ? "企業選択へ戻る" : undefined}
      onBack={canBackToCompany ? onBackCompany : undefined}
      actionLabel="現場追加"
      onAction={onAdd}
      deleteLabel="現場削除"
      onDelete={onDelete}
    />
  );
}

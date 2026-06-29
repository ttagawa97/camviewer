import { SelectionTable } from "../components/SelectionTable";
import type { Company } from "../types";

export function CompanySelectScreen({
  companies,
  onSearch,
  onSelect,
  onAdd,
  onDelete
}: {
  companies: Company[];
  onSearch: (keyword?: string) => void;
  onSelect: (company: Company) => void;
  onAdd: () => void;
  onDelete: (company: Company) => void;
}) {
  return (
    <SelectionTable
      title="企業一覧"
      searchPlaceholder="企業名で検索"
      emptyMessage="表示可能な企業がありません"
      rows={companies}
      columns={[
        ["company_name", "企業名"],
        ["status", "状態"],
        ["site_count", "現場数"],
        ["camera_count", "カメラ数"]
      ]}
      onSearch={onSearch}
      onSelect={onSelect}
      actionLabel="企業追加"
      onAction={onAdd}
      deleteLabel="企業削除"
      onDelete={onDelete}
    />
  );
}

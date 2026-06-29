import { useCallback, useState } from "react";
import { api } from "../api";
import { mock } from "../mock";
import type { User, UserFormValues } from "../types";

export function useUsers({
  useMock,
  withLoading,
  showToast
}: {
  useMock: boolean;
  withLoading: (task: () => Promise<void>) => Promise<void>;
  showToast: (message: string) => void;
}) {
  const [managedUsers, setManagedUsers] = useState<User[]>([]);

  const loadUsers = useCallback(
    (companyId?: string | null, siteId?: string | null) =>
      withLoading(async () => {
        setManagedUsers(useMock ? mock.users(companyId, siteId) : await api.users(companyId, siteId));
      }),
    [useMock, withLoading]
  );

  const saveUser = useCallback(
    async (values: UserFormValues, editingUserId?: string | null) => {
      await withLoading(async () => {
        const saved = useMock
          ? editingUserId
            ? mock.updateUser(editingUserId, values)
            : mock.createUser(values)
          : editingUserId
            ? await api.updateUser(editingUserId, values)
            : await api.createUser(values);
        setManagedUsers((current) => [saved, ...current.filter((user) => user.user_id !== saved.user_id)]);
        showToast(editingUserId ? "ユーザーを更新しました" : "ユーザーを追加しました");
      });
    },
    [showToast, useMock, withLoading]
  );

  const deleteUser = useCallback(
    async (user: User) => {
      if (!window.confirm(`${user.user_name} を削除します。よろしいですか？`)) return;
      await withLoading(async () => {
        if (useMock) mock.deleteUser(user.user_id);
        else await api.deleteUser(user.user_id);
        setManagedUsers((current) => current.filter((item) => item.user_id !== user.user_id));
        showToast("ユーザーを削除しました");
      });
    },
    [showToast, useMock, withLoading]
  );

  return { managedUsers, loadUsers, saveUser, deleteUser };
}

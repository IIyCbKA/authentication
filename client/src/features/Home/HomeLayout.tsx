import React from "react";
import styles from "./styles.module.scss";
import { Button, Divider } from "@/components";
import { useAppDispatch, useAppSelector } from "@/store/hooks.ts";
import { fetchAllUsers } from "@/domain/auth/thunks.ts";
import { selectAllUsers } from "@/domain/auth/selectors.ts";

export default function HomeLayout(): React.ReactElement {
  const allUsers = useAppSelector(selectAllUsers);
  const [isProcessing, setProcessing] = React.useState(false);
  const dispatch = useAppDispatch();

  const onGet = async (
    e: React.MouseEvent<HTMLButtonElement>,
  ): Promise<void> => {
    e.preventDefault();
    setProcessing(true);
    try {
      await dispatch(fetchAllUsers()).unwrap();
    } catch (e) {
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className={styles.layer}>
      <Button isLoading={isProcessing} onClick={onGet}>
        Get users list
      </Button>
      <Divider className={styles.divider} />
      {allUsers.length === 0 ? (
        <p className={styles.emptyList}>Пользователей нет</p>
      ) : (
        <ul className={styles.usersList}>
          {allUsers.map((user) => (
            <li key={user.id}>
              <p>id: {user.id}</p>
              <p>email: {user.email}</p>
              <p>username: {user.username}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

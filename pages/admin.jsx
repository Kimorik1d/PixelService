import { useEffect } from 'react';
import { useRouter } from 'next/router';
import styles from '../styles/Admin.module.css';
import { useUser } from '../context/UserContext';

export default function AdminPage() {
  const router = useRouter();
  const { user } = useUser();

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.replace('/');
    }
  }, [user]);

  // Пока проверка идет, можно не рендерить интерфейс
  if (!user || user.role !== 'admin') return null;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Администрирование</h1>
      <div className={styles.buttonContainer}>
        <button
          className={`${styles.button} ${styles.buttonRepairs}`}
          onClick={() => router.push('/repairsadmin')}
        >
          Заявки
        </button>
        <button
          className={`${styles.button} ${styles.buttonEquipment}`}
          onClick={() => router.push('/EditEquipment')}
        >
          Номенклатура
        </button>
        <button
          className={`${styles.button} ${styles.buttonProfiles}`}
          onClick={() => router.push('/profiles')}
        >
          Профили
        </button>
        <button
          className={`${styles.button} ${styles.buttonStatus}`}
          onClick={() => router.push('/status')}
        >
          Статус
        </button>
        <button
          className={`${styles.button} ${styles.buttonHome}`}
          onClick={() => router.push('/')}
        >
          На главную
        </button>
      </div>
    </div>
  );
}

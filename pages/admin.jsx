import { useRouter } from 'next/router';
import { useEffect } from 'react';
import styles from '../styles/Admin.module.css';
import { withAdminGuard } from '../lib/withAdminGuard';


function AdminPage() {
  
  const router = useRouter();

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
          className={`${styles.button} ${styles.buttonOverview}`}
          onClick={() => router.push('/overview')}
        >
          Обзор
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
          className={`${styles.button} ${styles.buttonLogs}`}
          onClick={() => router.push('/logs')}
        >
          Логи
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
export default withAdminGuard(AdminPage);
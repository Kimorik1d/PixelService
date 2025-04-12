import { useRouter } from 'next/router';
import styles from '../styles/Admin.module.css';

export default function AdminPage() {
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
        {/* Добавляем кнопку "На главную" */}
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

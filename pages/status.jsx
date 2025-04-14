import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useRouter } from 'next/router';
import styles from '../styles/Status.module.css';
import { useUser } from '../context/UserContext'; // 👈 добавили
import { withAdminGuard } from '../lib/withAdminGuard';

function StatusPage() {
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const router = useRouter();
  const { user } = useUser(); // 👈 получаем пользователя

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.replace('/');
    } else {
      checkConnection();
    }
  }, [user]);

  const checkConnection = async () => {
    const { error } = await supabase.from('repairs').select('id').limit(1);

    if (error) {
      setConnectionStatus('Ошибка подключения');
      setIsConnected(false);
    } else {
      setConnectionStatus('Успешное подключение');
      setIsConnected(true);
    }
  };

  // Пока не подтверждено, что это админ — ничего не рендерим
  if (!user || user.role !== 'admin') return null;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Статус подключения к базе данных</h1>

      <div className={styles.status}>
        <p>{connectionStatus}</p>
        <p>Статус подключения: {isConnected ? 'Подключено' : 'Не подключено'}</p>
      </div>

      <div className={styles.buttonContainer}>
        <button
          className={styles.buttonBack}
          onClick={() => router.push('/admin')}
        >
          Назад
        </button>
      </div>
    </div>
  );
}
export default withAdminGuard(StatusPage);
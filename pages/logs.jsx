import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import { useUser } from '../context/UserContext';
import styles from '../styles/Logs.module.css';

export default function LogsPage() {
  const { user } = useUser();
  const router = useRouter();
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    if (!user) return;
    if (user.role !== 'admin') {
      router.push('/');
    } else {
      fetchLogs();
    }
  }, [user]);

  const fetchLogs = async () => {
    const { data, error } = await supabase
      .from('logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Ошибка при загрузке логов:', error.message);
    } else {
      setLogs(data);
    }
  };

  const handleClearLogs = async () => {
    const confirmDelete = window.confirm('Вы уверены, что хотите удалить все логи?');
    if (!confirmDelete) return;

    const { error } = await supabase.from('logs').delete().neq('id', 0);
    if (error) {
      console.error('Ошибка при очистке логов:', error.message);
      alert('Ошибка при удалении логов');
    } else {
      alert('Логи успешно очищены!');
      fetchLogs();
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Журнал действий</h1>
        <div className={styles.headerButtons}>
          <button className={styles.backButton} onClick={() => router.push('/admin')}>
            Назад
          </button>
          <button className={styles.clearButton} onClick={handleClearLogs}>
            Очистка
          </button>
        </div>
      </div>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>Дата</th>
            <th>Пользователь</th>
            <th>Действие</th>
            <th>Доп. информация</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id}>
              <td>{new Date(log.created_at).toLocaleString()}</td>
              <td>{log.user_login}</td>
              <td>{log.action}</td>
              <td>{log.details || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

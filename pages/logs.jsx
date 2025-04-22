import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import { useUser } from '../context/UserContext';
import styles from '../styles/Logs.module.css';
import { withAdminGuard } from '../lib/withAdminGuard';

function LogsPage() {
  const { user } = useUser();
  const router = useRouter();
  const [logs, setLogs] = useState([]);
  const [actionFilter, setActionFilter] = useState('Все');
  const [userFilter, setUserFilter] = useState('Все');
  

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

  const uniqueActions = ['Все', ...Array.from(new Set(logs.map(log => log.action)))];
  const uniqueUsers = ['Все', ...Array.from(new Set(logs.map(log => log.user_login)))];

  const filteredLogs = logs.filter(log => {
    const actionMatch = actionFilter === 'Все' || log.action === actionFilter;
    const userMatch = userFilter === 'Все' || log.user_login === userFilter;
    return actionMatch && userMatch;
  });

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

      <div className={styles.filter}>
        <label htmlFor="actionFilter">Фильтр по действию:</label>
        <select
          id="actionFilter"
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
        >
          {uniqueActions.map((action, idx) => (
            <option key={idx} value={action}>
              {action}
            </option>
          ))}
        </select>

        <label htmlFor="userFilter" style={{ marginLeft: '20px' }}>Фильтр по пользователю:</label>
        <select
          id="userFilter"
          value={userFilter}
          onChange={(e) => setUserFilter(e.target.value)}
        >
          {uniqueUsers.map((login, idx) => (
            <option key={idx} value={login}>
              {login}
            </option>
          ))}
        </select>
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
          {filteredLogs.map((log) => (
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
export default withAdminGuard(LogsPage);

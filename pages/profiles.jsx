import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import styles from '../styles/Profiles.module.css';
import { useRouter } from 'next/router';
import { useUser } from '../context/UserContext'; // 👈 добавили импорт

export default function Profiles() {
  const { user } = useUser(); // 👈 получаем пользователя из контекста
  const router = useRouter();

  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({
    login: '',
    password: '',
    role: 'user',
    club_address: '',
  });
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.replace('/');
    } else {
      fetchUsers();
    }
  }, [user]);

  const fetchUsers = async () => {
    const { data, error } = await supabase.from('users').select('*');
    if (error) {
      console.error('Ошибка загрузки пользователей:', error);
    } else {
      setUsers(data);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!newUser.login || !newUser.password) {
      setErrorMessage('Логин и пароль обязательны для заполнения');
      return;
    }

    const { error } = await supabase.from('users').insert([
      {
        login: newUser.login,
        password: newUser.password,
        role: newUser.role,
        club_address: newUser.club_address,
      },
    ]);

    if (error) {
      console.error('Ошибка при добавлении пользователя:', error);
      setErrorMessage('Ошибка при добавлении пользователя');
    } else {
      setNewUser({ login: '', password: '', role: 'user', club_address: '' });
      fetchUsers();
    }
  };

  const handleDeleteUser = async (userId) => {
    const { error } = await supabase.from('users').delete().match({ id: userId });
    if (error) {
      console.error('Ошибка при удалении пользователя:', error);
    } else {
      fetchUsers();
    }
  };

  // 🔒 пока пользователь не подтверждён как админ — не рендерим
  if (!user || user.role !== 'admin') return null;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Пользователи</h1>

      <button onClick={() => router.push('/admin')} className={styles.backButton}>Назад</button>

      <div className={styles.userList}>
        <h2>Список пользователей</h2>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Логин</th>
              <th>Роль</th>
              <th>Адрес клуба</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.login}</td>
                <td>{user.role}</td>
                <td>{user.club_address || '-'}</td>
                <td>
                  <button
                    className={styles.deleteButton}
                    onClick={() => handleDeleteUser(user.id)}
                  >
                    Удалить
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles.formContainer}>
        <h2>Добавить нового пользователя</h2>
        <form onSubmit={handleAddUser}>
          <div className={styles.formGroup}>
            <label htmlFor="login" className={styles.formLabel}>Логин</label>
            <input
              type="text"
              id="login"
              value={newUser.login}
              onChange={(e) => setNewUser({ ...newUser, login: e.target.value })}
              required
              className={styles.inputField}
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="password" className={styles.formLabel}>Пароль</label>
            <input
              type="password"
              id="password"
              value={newUser.password}
              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              required
              className={styles.inputField}
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="role" className={styles.formLabel}>Роль</label>
            <select
              id="role"
              value={newUser.role}
              onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
              className={styles.inputField}
            >
              <option value="user">Пользователь</option>
              <option value="admin">Администратор</option>
            </select>
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="club_address" className={styles.formLabel}>Адрес клуба</label>
            <input
              type="text"
              id="club_address"
              value={newUser.club_address}
              onChange={(e) => setNewUser({ ...newUser, club_address: e.target.value })}
              className={styles.inputField}
            />
          </div>
          {errorMessage && <div className={styles.error}>{errorMessage}</div>}
          <button type="submit" className={styles.addButton}>Добавить пользователя</button>
        </form>
      </div>
    </div>
  );
}

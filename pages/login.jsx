import { useState } from 'react';
import { useRouter } from 'next/router';
import { useUser } from '../context/UserContext';
import styles from '../styles/Login.module.css';

export default function Login() {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const { login: loginUser } = useUser();
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    // Вход пользователя с проверкой логина и пароля
    const { success, message } = await loginUser(login, password);

    if (success) {
      router.push('/'); // Перенаправляем на главную страницу
    } else {
      setErrorMessage(message); // Показываем ошибку
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Авторизация</h1>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formGroup}>
          <label htmlFor="login" className={styles.label}>Логин</label>
          <input
            type="text"
            id="login"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            className={styles.input}
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="password" className={styles.label}>Пароль</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={styles.input}
            required
          />
        </div>

        {errorMessage && <div className={styles.error}>{errorMessage}</div>}

        <button type="submit" className={styles.button}>Войти</button>
      </form>
    </div>
  );
}

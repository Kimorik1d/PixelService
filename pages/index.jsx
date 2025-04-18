import { useRouter } from 'next/router';
import { useUser } from '../context/UserContext';
import styles from '../styles/Index.module.css';

export default function Home() {
  const { user, logout } = useUser();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const handleLoginRedirect = () => {
    router.push('/login');
  };

  const handleCreateRequest = () => {
    if (!user) {
      alert('Пожалуйста, авторизуйтесь для создания заявки.');
    } else {
      router.push('/create-request');
    }
  };

  const handleViewRepairs = () => {
    if (!user) {
      alert('Пожалуйста, авторизуйтесь для просмотра заявок.');
    } else {
      router.push('/repairs');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.heroSection}>
        <h1 className={styles.title}>Добро пожаловать в систему ремонта PIXEL</h1>
      </div>

      <div className={styles.topLeft}>
        {user ? (
          <>
            <p className={styles.userInfo}>Вы вошли как: {user.login}</p>
            <button className={styles.button} onClick={handleLogout}>
              Выйти из профиля
            </button>
          </>
        ) : (
          <>
            <p className={styles.userInfo}>Вы не авторизованы</p>
            <button className={styles.button} onClick={handleLoginRedirect}>
              Войти
            </button>
          </>
        )}
      </div>

      <div className={styles.mainContent}>
      <div className={styles.buttonContainer}>
  <button
    className={styles.button}
    onClick={handleCreateRequest}
    disabled={!user}
  >
    Создать заявку
  </button>
  <button
    className={styles.button}
    onClick={handleViewRepairs}
    disabled={!user}
  >
    Просмотр заявок
  </button>
  <button
    className={styles.button}
    onClick={() => router.push('/cards')}
    disabled={!user}
  >
    Состояние клуба
  </button>
</div>


        {/* Центрированные кнопки под действиями */}
        {user && (user.role === 'admin' || user.role === 'courier') && (
          <div className={styles.bottomCenter}>
            {user.role === 'admin' && (
              <button
                className={styles.buttonAdmin}
                onClick={() => router.push('/admin')}
              >
                Администрирование
              </button>
            )}
            {user.role === 'courier' && (
              <button
                className={styles.buttonAdmin}
                onClick={() => router.push('/courier')}
              >
                Курьер
              </button>
            )}
          </div>
        )}
      </div>

      
    </div>
  );
}

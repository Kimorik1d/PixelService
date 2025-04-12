import { useRouter } from 'next/router';
import { useUser } from '../context/UserContext'; // Импортируем контекст
import styles from '../styles/Index.module.css';

export default function Home() {
  const { user, logout } = useUser(); // Получаем данные о пользователе и функцию выхода
  const router = useRouter();

  const handleLogout = () => {
    logout(); // Вызываем функцию для выхода из системы
    router.push('/login'); // Перенаправляем на страницу входа
  };

  const handleLoginRedirect = () => {
    router.push('/login'); // Перенаправление на страницу логина
  };

  const handleCreateRequest = () => {
    if (!user) {
      alert('Пожалуйста, авторизуйтесь для создания заявки.');
    } else {
      router.push('/create-request'); // Перенаправляем на страницу создания заявки
    }
  };

  const handleViewRepairs = () => {
    if (!user) {
      alert('Пожалуйста, авторизуйтесь для просмотра заявок.');
    } else {
      router.push('/repairs'); // Перенаправляем на страницу просмотра заявок
    }
  };

  return (
    <div className={styles.container}>
      {/* Новый заголовок */}
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
            disabled={!user} // Делаем кнопку неактивной, если нет пользователя
          >
            Создать заявку
          </button>
          <button
            className={styles.button}
            onClick={handleViewRepairs}
            disabled={!user} // Делаем кнопку неактивной, если нет пользователя
          >
            Просмотр заявок
          </button>
        </div>
      </div>

      {/* Показываем кнопку "Администрирование", только если пользователь авторизован и имеет роль admin */}
      {user && user.role === 'admin' && (
        <div className={styles.bottomRight}>
          <button
            className={styles.buttonAdmin}
            onClick={() => router.push('/admin')}
          >
            Администрирование
          </button>
        </div>
      )}

      {/* Логотип в левом нижнем углу */}
      <div className={styles.logoContainer}>
        <img
          src="/images/logo.jpg"
          alt="Logo"
          className={styles.logo}
        />
      </div>
    </div>
  );
}

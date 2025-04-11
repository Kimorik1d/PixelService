import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  // Загружаем пользователя из localStorage при старте
  useEffect(() => {
    const storedUser = localStorage.getItem('pixelUser');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  // Авторизация пользователя по логину и паролю
  const login = async (login, password) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('login', login)
      .eq('password', password)
      .single(); // возвращает один объект

    if (error || !data) {
      return { success: false, message: 'Неверный логин или пароль' };
    }

    const userData = {
      login: data.login,
      role: data.role,
      club_address: data.club_address,
    };

    setUser(userData);
    localStorage.setItem('pixelUser', JSON.stringify(userData));

    return { success: true };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('pixelUser');
  };

  return (
    <UserContext.Provider value={{ user, login, logout }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);

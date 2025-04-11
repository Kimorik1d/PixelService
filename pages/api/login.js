// pages/api/login.js
import { supabase } from '../../lib/supabaseClient'; // Подключаем ваш supabase клиент

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { login, password } = req.body;

    // Запрос к базе данных для поиска пользователя с данным логином
    const { data, error } = await supabase
      .from('users') // Название вашей таблицы пользователей
      .select('*')
      .eq('login', login)
      .single(); // Получаем одного пользователя

    if (error) {
      return res.status(500).json({ error: 'Ошибка при поиске пользователя' });
    }

    if (data && data.password === password) {
      // Если пользователь найден и пароли совпадают
      return res.status(200).json({ id: data.id, login: data.login, role: data.role });
    } else {
      // Если пароли не совпадают или пользователя нет
      return res.status(401).json({ error: 'Неверный логин или пароль' });
    }
  } else {
    res.status(405).json({ error: 'Метод не разрешен' });
  }
}

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import styles from '../styles/Repairs.module.css';
import { useRouter } from 'next/router';

import { useUser } from '../context/UserContext';

export default function CourierPage() {
  const { user } = useUser();
  const [repairs, setRepairs] = useState([]);
  const router = useRouter();

  useEffect(() => {
    if (user?.role === 'courier') fetchRepairs();
  }, [user]);

  const fetchRepairs = async () => {
    const { data, error } = await supabase
      .from('repairs')
      .select('*')
      .eq('status', 'У курьера');

    if (error) {
      console.error('Ошибка при загрузке заявок:', error.message);
    } else {
      setRepairs(data);
    }
  };

  const handleConfirm = async (id) => {
    const updateData = {
      status: 'В ремонте',
      approved: true,
      sent_at: new Date().toISOString()
    };
    const { error } = await supabase.from('repairs').update(updateData).eq('id', id);
    if (error) {
      console.error('Ошибка при подтверждении:', error.message);
    } else {
      fetchRepairs();
    }
  };

  const formatDateTime = (isoString) => {
    const date = new Date(isoString);
    date.setHours(date.getHours() + 7); // добавляем 7 часов вручную
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };
  

  if (user?.role !== 'courier') {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>Доступ запрещён</h1>
        <div className={styles.buttonContainer}>
          <button className={styles.backButton} onClick={() => router.push('/')}>На главную</button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Заявки у курьера</h1>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>Клуб</th>
            <th>Описание</th>
            <th>Номер ПК</th>
            <th>Тип оборудования</th>
            <th>Модель</th>
            <th>Статус</th>
            <th>Дата создания</th>
            <th>Действие</th>
          </tr>
        </thead>
        <tbody>
          {repairs.map((repair) => (
            <tr key={repair.id}>
              <td>{repair.club_address}</td>
              <td>{repair.description}</td>
              <td>{repair.pc_number}</td>
              <td>{repair.equipment_type}</td>
              <td>{repair.model}</td>
              <td>{repair.status}</td>
              <td>{formatDateTime(repair.created_at)}</td>
              <td>
                <button className={styles.confirmButton} onClick={() => handleConfirm(repair.id)}>
                  Подтверждено
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className={styles.buttonContainer}>
        <button className={styles.backButton} onClick={() => router.push('/')}>На главную</button>
      </div>
    </div>
  );
}

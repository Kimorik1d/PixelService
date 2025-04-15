import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import styles from '../styles/Courier.module.css';
import { useRouter } from 'next/router';
import { useUser } from '../context/UserContext';

export default function CourierPage() {
  const { user } = useUser();
  const [tab, setTab] = useState('pickup');
  const [selectedClub, setSelectedClub] = useState(null);
  const [repairs, setRepairs] = useState([]);
  const [shippingRepairs, setShippingRepairs] = useState([]);
  const [clubDelivery, setClubDelivery] = useState([]);
  const [clubAccepted, setClubAccepted] = useState([]);
  const router = useRouter();

  const clubTabs = [
    'Мира', 'Мартынова', 'Киренского', 'Алексеева',
    '9 мая', 'Полигон', 'Лесников', 'Карамзина',
  ];

  useEffect(() => {
    if (user?.role === 'courier') {
      fetchAllData();
      const interval = setInterval(fetchAllData, 5000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchAllData = () => {
    fetchByStatus('У курьера', setRepairs);
    fetchByStatus('На отправке', setShippingRepairs);
    fetchByStatus('Доставка в клуб', setClubDelivery);
    fetchByStatus('Принято в клубе', setClubAccepted);
  };

  const fetchByStatus = async (status, setter) => {
    const { data, error } = await supabase.from('repairs').select('*').eq('status', status);
    if (error) console.error(`Ошибка при загрузке статуса "${status}":`, error.message);
    else setter(data);
  };

  const handleConfirm = async (id) => {
    const repair = repairs.find((r) => r.id === id);
    const updateData = { status: 'В ремонте', approved: true, sent_at: new Date().toISOString() };
    const { error } = await supabase.from('repairs').update(updateData).eq('id', id);
    if (!error) {
      await supabase.from('logs').insert([{
        user_login: user?.login || 'неизвестно',
        action: 'Курьер подтвердил получение',
        details: `ID: ${id}, клуб: ${repair?.club_address}, ПК: ${repair?.pc_number}`,
      }]);
      fetchAllData();
    }
  };

  const handleReturn = async (id) => {
    const repair = shippingRepairs.find((r) => r.id === id);
    const updateData = { status: 'Неисправно', approved: false };
    const { error } = await supabase.from('repairs').update(updateData).eq('id', id);
    if (!error) {
      await supabase.from('logs').insert([{
        user_login: user?.login || 'неизвестно',
        action: 'Курьер вернул заявку',
        details: `ID: ${id}, клуб: ${repair?.club_address}, ПК: ${repair?.pc_number}`,
      }]);
      fetchAllData();
    }
  };

  const handleClose = async (id) => {
    const repair = clubAccepted.find((r) => r.id === id);
    const updateData = { status: 'Закрыт', closed_at: new Date().toISOString() };
    const { error } = await supabase.from('repairs').update(updateData).eq('id', id);
    if (!error) {
      await supabase.from('logs').insert([{
        user_login: user?.login || 'неизвестно',
        action: 'Курьер закрыл заявку',
        details: `ID: ${id}, клуб: ${repair?.club_address}, ПК: ${repair?.pc_number}`,
      }]);
      fetchAllData();
    }
  };

  const handleReturnToRepair = async (id) => {
    const repair = clubDelivery.find((r) => r.id === id);
    const updateData = { status: 'В ремонте' };
    const { error } = await supabase.from('repairs').update(updateData).eq('id', id);
    if (!error) {
      await supabase.from('logs').insert([{
        user_login: user?.login || 'неизвестно',
        action: 'Курьер вернул в ремонт',
        details: `ID: ${id}, клуб: ${repair?.club_address}, ПК: ${repair?.pc_number}`,
      }]);
      fetchAllData();
    }
  };

  const formatDateTime = (isoString) => {
    const date = new Date(isoString);
    date.setHours(date.getHours() + 7);
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

  const filterByClub = (arr) => selectedClub ? arr.filter((r) => r.club_address.includes(selectedClub)) : arr;

  const filteredRepairs = filterByClub(repairs);
  const filteredShipping = filterByClub(shippingRepairs);
  const filteredDelivery = filterByClub(clubDelivery);
  const filteredAccepted = filterByClub(clubAccepted);

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Панель курьера</h1>

      <div className={styles.mainTabContainer}>
        <button className={`${styles.mainTab} ${tab === 'pickup' ? styles.activeMainTab : ''}`} onClick={() => setTab('pickup')}>Забрать</button>
        <button className={`${styles.mainTab} ${tab === 'delivery' ? styles.activeMainTab : ''}`} onClick={() => setTab('delivery')}>Отдать</button>
      </div>

      <div className={styles.clubTabContainer}>
        {clubTabs.map((club) => {
          const all = [...repairs, ...shippingRepairs, ...clubDelivery, ...clubAccepted];
          const count = all.filter((r) => r.club_address.includes(club)).length;
          return (
            <button key={club} className={`${styles.clubTab} ${selectedClub === club ? styles.activeClubTab : ''}`} onClick={() => setSelectedClub(club)}>
              {club} ({count})
            </button>
          );
        })}
        <button className={`${styles.clubTab} ${selectedClub === null ? styles.activeClubTab : ''}`} onClick={() => setSelectedClub(null)}>Все</button>
      </div>

      {tab === 'pickup' && (
        <>
          <h2 className={styles.subtitle}>Заявки у курьера</h2>
          <table className={styles.table}>
            <thead><tr><th>Клуб</th><th>Описание</th><th>ПК</th><th>Тип</th><th>Модель</th><th>Статус</th><th>Дата</th><th>Действие</th></tr></thead>
            <tbody>{filteredRepairs.map((r) => (
              <tr key={r.id}><td>{r.club_address}</td><td>{r.description}</td><td>{r.pc_number}</td><td>{r.equipment_type}</td><td>{r.model}</td><td>{r.status}</td><td>{formatDateTime(r.created_at)}</td><td><button className={styles.confirmButton} onClick={() => handleConfirm(r.id)}>Подтверждено</button></td></tr>
            ))}</tbody>
          </table>

          <h2 className={styles.subtitle}>Заявки на отправке</h2>
          <table className={styles.table}>
            <thead><tr><th>Клуб</th><th>Описание</th><th>ПК</th><th>Тип</th><th>Модель</th><th>Статус</th><th>Дата</th><th>Действие</th></tr></thead>
            <tbody>{filteredShipping.map((r) => (
              <tr key={r.id}><td>{r.club_address}</td><td>{r.description}</td><td>{r.pc_number}</td><td>{r.equipment_type}</td><td>{r.model}</td><td>{r.status}</td><td>{formatDateTime(r.created_at)}</td><td><button className={styles.returnButton} onClick={() => handleReturn(r.id)}>Вернуть</button></td></tr>
            ))}</tbody>
          </table>
        </>
      )}

      {tab === 'delivery' && (
        <>
          <h2 className={styles.subtitle}>Принято в клубе</h2>
          <table className={styles.table}>
            <thead><tr><th>Клуб</th><th>Описание</th><th>ПК</th><th>Тип</th><th>Модель</th><th>Статус</th><th>Дата</th><th>Действие</th></tr></thead>
            <tbody>{filteredAccepted.map((r) => (
              <tr key={r.id}><td>{r.club_address}</td><td>{r.description}</td><td>{r.pc_number}</td><td>{r.equipment_type}</td><td>{r.model}</td><td>{r.status}</td><td>{formatDateTime(r.created_at)}</td><td><button className={styles.confirmButton} onClick={() => handleClose(r.id)}>Подтверждено</button></td></tr>
            ))}</tbody>
          </table>

          <h2 className={styles.subtitle}>Доставка в клуб</h2>
          <table className={styles.table}>
            <thead><tr><th>Клуб</th><th>Описание</th><th>ПК</th><th>Тип</th><th>Модель</th><th>Статус</th><th>Дата</th><th>Действие</th></tr></thead>
            <tbody>{filteredDelivery.map((r) => (
              <tr key={r.id}><td>{r.club_address}</td><td>{r.description}</td><td>{r.pc_number}</td><td>{r.equipment_type}</td><td>{r.model}</td><td>{r.status}</td><td>{formatDateTime(r.created_at)}</td><td><button className={styles.returnButton} onClick={() => handleReturnToRepair(r.id)}>Вернуть</button></td></tr>
            ))}</tbody>
          </table>
        </>
      )}

      <div className={styles.buttonContainer}>
        <button className={styles.backButton} onClick={() => router.push('/')}>На главную</button>
      </div>
    </div>
  );
}

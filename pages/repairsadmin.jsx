import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import styles from '../styles/RepairsAdmin.module.css';
import { useRouter } from 'next/router';
import { useUser } from '../context/UserContext';

export default function RepairsAdmin() {
  const { user } = useUser();
  const router = useRouter();

  const [repairs, setRepairs] = useState([]);
  const [addressOptions] = useState([
    "Мартынова",
    "Мира",
    "Полигон",
    "Алексеева",
    "9 мая",
    "Лесников",
    "Киренского",
    "Карамзина"
  ]);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedAddress, setSelectedAddress] = useState('');
  const [sortOrder, setSortOrder] = useState('desc');
  const [hideClosed, setHideClosed] = useState(true);

  useEffect(() => {
    if (!isUserReady) return;

    if (!user || user.role !== 'admin') {
      router.replace('/');
    } else {
      fetchRepairs();
    }
  }, [user]);

    const [isUserReady, setIsUserReady] = useState(false);

  useEffect(() => {
    if (user !== undefined) {
      setIsUserReady(true);
    }
  }, [user]);

  useEffect(() => {
    if (!isUserReady) return;

    if (!user || user.role !== 'admin') {
      router.replace('/');
    } else {
      fetchRepairs();
    }
  }, [isUserReady, user]);


  const fetchRepairs = async () => {
    const { data, error } = await supabase.from('repairs').select('*');
    if (error) {
      console.error('Ошибка при загрузке заявок:', error);
    } else {
      setRepairs(data);
    }
  };

  const filteredRepairs = repairs
    .filter(repair => {
      const statusMatch = selectedStatus ? repair.status === selectedStatus : true;
      const closedMatch = hideClosed ? repair.status !== 'Закрыт' : true;
      const addressMatch = selectedAddress ? repair.club_address === selectedAddress : true;
      return statusMatch && addressMatch && closedMatch;
    })
    .sort((a, b) => {
      const dateA = new Date(a.created_at);
      const dateB = new Date(b.created_at);
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });

  const handleStatusChange = async (repairId, newStatus) => {
    const { error } = await supabase
      .from('repairs')
      .update({ status: newStatus })
      .eq('id', repairId);

    if (error) {
      console.error('Ошибка при обновлении статуса:', error);
    } else {
      setRepairs((prevRepairs) =>
        prevRepairs.map((repair) =>
          repair.id === repairId ? { ...repair, status: newStatus } : repair
        )
      );
    }
  };

  const renderStatusBadge = (status) => {
    const statusClass =
      status === 'Ожидает'
        ? styles.statusPending
        : status === 'У курьера'
        ? styles.statusCourier
        : status === 'В ремонте'
        ? styles.statusInRepair
        : styles.statusClosed;

    return <span className={`${styles.statusBadge} ${statusClass}`}>{status}</span>;
  };

  if (!user || user.role !== 'admin') return null;

  return (
    <div className={styles.container}>
      <h1>Администрирование заявок</h1>

      <div className={styles.filters}>
        <label>Фильтр по статусу:</label>
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
        >
          <option value="">Все статусы</option>
          <option value="Ожидает">Ожидает</option>
          <option value="У курьера">У курьера</option>
          <option value="В ремонте">В ремонте</option>
          <option value="Закрыт">Закрыт</option>
        </select>

        <label>Фильтр по клубу:</label>
        <select
          value={selectedAddress}
          onChange={(e) => setSelectedAddress(e.target.value)}
        >
          <option value="">Все клубы</option>
          {addressOptions.map((address, index) => (
            <option key={index} value={address}>
              {address}
            </option>
          ))}
        </select>

     
        <label>Сортировка по дате создания:</label>
        
        <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
          <option value="asc">По возрастанию</option>
          <option value="desc">По убыванию</option>
        </select>
        <div style={{ textAlign: 'right', margin: '5px 0' }}>
        <label>
          <input
            type="checkbox"
            checked={hideClosed}
            onChange={() => setHideClosed(!hideClosed)}
            style={{ marginRight: '6px' }}
          />
          Скрыть закрытые
        </label>
      </div>
      </div>

    

      <table className={styles.table}>
        <thead>
          <tr>
            <th>Клуб</th>
            <th>Описание</th>
            <th>Номер ПК</th>
            <th>Тип оборудования</th>
            <th>Модель</th>
            <th>Дата закрытия</th>
            <th>Дата создания</th>
            <th>Статус</th>
            <th>Изменить статус</th>
          </tr>
        </thead>
        <tbody>
          {filteredRepairs.map((repair) => (
            <tr key={repair.id}>
              <td>{repair.club_address}</td>
              <td>{repair.description}</td>
              <td>{repair.pc_number}</td>
              <td>{repair.equipment_type}</td>
              <td>{repair.model}</td>
              <td>{repair.closed_at ? new Date(repair.closed_at).toLocaleDateString() : ''}</td>
              <td>{new Date(repair.created_at).toLocaleDateString()}</td>
              <td>{renderStatusBadge(repair.status)}</td>
              <td>
                <select
                  value={repair.status}
                  onChange={(e) => handleStatusChange(repair.id, e.target.value)}
                >
                  <option value="Ожидает">Ожидает</option>
                  <option value="У курьера">У курьера</option>
                  <option value="В ремонте">В ремонте</option>
                  <option value="Закрыт">Закрыт</option>
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <button onClick={() => router.push('/admin')} className={styles.backButton}>
        Назад
      </button>
    </div>
  );
}

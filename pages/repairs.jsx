import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import styles from '../styles/Repairs.module.css';
import { useRouter } from 'next/router';
import { useUser } from '../context/UserContext';

export default function RepairsPage() {
  const [repairs, setRepairs] = useState([]);
  const [pcNumbers, setPcNumbers] = useState({});
  const [activeTab, setActiveTab] = useState('Ожидание');
  const { user } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (user) fetchRepairs();
  }, [user]);

  const fetchRepairs = async () => {
    const { data, error } = await supabase.from('repairs').select('*');
    if (error) console.error('Ошибка при загрузке заявок:', error.message);
    else {
      setRepairs(data);
      setPcNumbers(data.reduce((acc, r) => ({ ...acc, [r.id]: r.pc_number }), {}));
    }
  };

const updateStatus = async (id, newStatus) => {
    const updateData = { status: newStatus };

    if (newStatus === 'Закрыт') {
      updateData.closed_at = new Date().toISOString();
    }

    if (newStatus === 'В ремонте') {
      updateData.sent_at = new Date().toISOString();
    }

    const { error } = await supabase.from('repairs').update(updateData).eq('id', id);
    if (error) {
      console.error('Ошибка при обновлении статуса:', error.message);
    } else {
      fetchRepairs();
    }
  };

  const confirmRepair = async (id) => {
    const updateData = {
      status: 'В ремонте',
      sent_at: new Date().toISOString(),
      approved: true
    };
    const { error } = await supabase.from('repairs').update(updateData).eq('id', id);
    if (error) console.error('Ошибка при подтверждении:', error.message);
    else fetchRepairs();
  };

  

  const updatePcNumber = async (id, newNumber) => {
    const { error } = await supabase.from('repairs').update({ pc_number: newNumber }).eq('id', id);
    if (error) console.error('Ошибка при обновлении номера ПК:', error.message);
    else fetchRepairs();
  };

  const renderPcNumberCell = (repair, editable = true) => {
    if (!editable) return <span>{repair.pc_number}</span>;
    const value = pcNumbers[repair.id] || '';
    const handleBlur = () => {
      if (repair.pc_number !== value) updatePcNumber(repair.id, value);
    };
    return (
      <input
        type="text"
        value={value}
        className={styles.inputInline}
        onChange={(e) => setPcNumbers((prev) => ({ ...prev, [repair.id]: e.target.value }))}
        onBlur={handleBlur}
      />
    );
  };

  const renderStatusBadge = (status) => {
    const statusClass =
      status === 'Неисправно' ? styles.statusPending :
      status === 'У курьера' ? styles.statusCourier :
      status === 'В ремонте' ? styles.statusInRepair :
      styles.statusClosed;
    return (
      <span className={`${styles.statusBadge} ${statusClass}`} style={{ whiteSpace: 'nowrap' }}>
        {status}
      </span>
    );
  };

  const formatDateTime = (isoString) => {
    const date = new Date(isoString);
    date.setHours(date.getHours() + 7); // добавляем 7 часов вручную
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };
  
  

  const renderTable = (title, filteredRepairs, actions) => (
    <div className={styles.tableSection}>
      <h2 className={styles.tableTitle}>{title}</h2>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Клуб</th>
            <th>Номер ПК</th>
            <th>Тип оборудования</th>
            <th>Модель</th>
            <th>Дата создания</th>
            {title !== 'Ожидание' && title !== 'На отправке' && <th>Дата отправки</th>}
            {title !== 'Ожидание' && title !== 'На отправке' && title !== 'В ремонте' && <th>Дата закрытия</th>}
            <th>Статус</th>
            {title !== 'История' && <th>Действия</th>}
          </tr>
        </thead>
        <tbody>
          {filteredRepairs.map((repair) => (
            <tr key={repair.id}>
              <td>{repair.id}</td>
              <td>{repair.club_address}</td>
              <td>{renderPcNumberCell(repair, title !== 'История')}</td>
              <td>{repair.equipment_type}</td>
              <td>{repair.model}</td>
              <td>{formatDateTime(repair.created_at)}</td>
              {title !== 'Ожидание' && title !== 'На отправке' && <td>{repair.sent_at ? formatDateTime(repair.sent_at) : ''}</td>}
              {title !== 'Ожидание' && title !== 'На отправке' && title !== 'В ремонте' && <td>{repair.closed_at ? formatDateTime(repair.closed_at) : ''}</td>}
              <td>{renderStatusBadge(repair.status)}</td>
              {title !== 'История' && <td>{actions(repair)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const filteredRepairs = repairs.filter(r => user?.role === 'courier' || r.club_address === user?.club_address);

  const tabOptions = user?.role === 'courier'
    ? ['На отправке']
    : ['Ожидание', 'На отправке', 'В ремонте', 'История'];

  const filteredByTab = {
    'Ожидание': filteredRepairs.filter((r) => r.status === 'Неисправно'),
    'На отправке': filteredRepairs.filter((r) => r.status === 'На отправке' || r.status === 'У курьера'),
    'В ремонте': filteredRepairs.filter((r) => r.status === 'В ремонте'),
    'История': filteredRepairs.filter((r) => r.status === 'Закрыт'),
  };

  const renderActions = (repair) => {
    if (user?.role === 'courier' && activeTab === 'На отправке' && repair.status === 'На отправке') {
      return <button onClick={() => updateStatus(repair.id, 'У курьера')}>Передано</button>;
    }
    if (activeTab === 'Ожидание') {
      return <button onClick={() => updateStatus(repair.id, 'На отправке')}>Отправлено</button>;
    }
    if (activeTab === 'На отправке') {
      return <button onClick={() => updateStatus(repair.id, 'У курьера')}>Передано</button>;
    }
    if (activeTab === 'В ремонте') {
      return <button onClick={() => updateStatus(repair.id, 'Закрыт')}>Закрыть</button>;
    }
    return null;
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Список заявок</h1>

      <div className={styles.tabs}>
        {tabOptions.map(tab => (
          <button
            key={tab}
            className={`${styles.tabButton} ${activeTab === tab ? styles.activeTab : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {renderTable(activeTab, filteredByTab[activeTab], renderActions)}

      <div className={styles.buttonContainer}>
        <button className={styles.backButton} onClick={() => router.push('/')}>На главную</button>
      </div>
    </div>
  );
}

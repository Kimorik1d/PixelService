import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import styles from '../styles/RepairsAdmin.module.css';
import { useRouter } from 'next/router';

export default function RepairsAdmin() {
  const [repairs, setRepairs] = useState([]);
  const [activeTab, setActiveTab] = useState('Неисправно');
  const router = useRouter();
  const [selectedAddress, setSelectedAddress] = useState('');

  const addressTabs = [
    'Киренского', 'Карамзина', 'Лесников', 'Мира',
    'Мартынова', 'Алексеева', 'Полигон', '9 мая'
  ];

  const statusTabs = [
    { label: 'Неисправно', value: 'Неисправно' },
    { label: 'Отправка', value: 'Отправка' },
    { label: 'Ремонт', value: 'В ремонте' },
    { label: 'История', value: 'Закрыт' },
  ];

  const fetchRepairs = async () => {
    const { data, error } = await supabase
      .from('repairs')
      .select('id, club_address, description, pc_number, equipment_type, model, status, created_at, closed_at, sent_at');
    if (error) {
      console.error('Ошибка при загрузке заявок:', error);
    } else {
      setRepairs(data);
    }
  };

  useEffect(() => {
    fetchRepairs();
  }, []);

  const filteredRepairs = repairs.filter((repair) => {
    const matchesStatus = (activeTab === 'Неисправно')
      ? repair.status === 'Неисправно'
      : (activeTab === 'Отправка')
      ? repair.status === 'На отправке' || repair.status === 'У курьера'
      : repair.status === activeTab;

    const matchesAddress = selectedAddress ? repair.club_address === selectedAddress : true;

    return matchesStatus && matchesAddress;
  });

  const handleStatusChange = async (repairId, newStatus) => {
    const updateData = { status: newStatus };

    if (newStatus === 'В ремонте') {
      updateData.sent_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('repairs')
      .update(updateData)
      .eq('id', repairId);

    if (error) {
      console.error('Ошибка при обновлении статуса:', error);
    } else {
      setRepairs((prevRepairs) =>
        prevRepairs.map((repair) =>
          repair.id === repairId ? { ...repair, ...updateData } : repair
        )
      );
    }
  };

  const showClosedAt = activeTab === 'Закрыт';
  const showSentAtColumn = activeTab === 'В ремонте' || activeTab === 'Закрыт';

  const renderTableHeader = () => {
  return (
    <tr>
      <th style={{ width: '5px' }}>ID</th>
      <th style={{ width: '20px' }}>Клуб</th>
      <th style={{ width: '5px' }}>ПК №</th>
      <th style={{ width: '25px' }}>Тип</th>
      <th style={{ width: '25px' }}>Модель</th>
      <th style={{ width: '80px' }}>Описание</th>
      <th style={{ width: '20px' }}>Создана</th>
      {showSentAtColumn && <th style={{ width: '20px' }}>Отправлена</th>}
      {showClosedAt && <th style={{ width: '20px' }}>Закрыта</th>}
      <th style={{ width: '15px' }}>Статус</th>
    </tr>
  );
};

  const renderTableRow = (repair) => {
    const tdStyle = [
      { width: '20px' }, // ID
      { width: '40px' }, // Club
      { width: '20px' }, // PC Number
      { width: '30px' }, // Type
      { width: '30px' }, // Model
      { width: '100px' }, // Description
      { width: '30px' }, // Created
      { width: '30px' }, // Status
    ];

    return (
      <tr key={repair.id}>
        <td style={tdStyle[0]}>{repair.id}</td>
        <td style={tdStyle[1]}>{repair.club_address}</td>
        <td style={tdStyle[2]}>{repair.pc_number}</td>
        <td style={tdStyle[3]}>{repair.equipment_type}</td>
        <td style={tdStyle[4]}>{repair.model}</td>
        <td style={tdStyle[5]}>{repair.description}</td>
        <td style={tdStyle[6]}>{(() => { const d = new Date(repair.created_at); d.setHours(d.getHours() + 7); return d.toLocaleString('ru-RU', { hour: '2-digit', minute: '2-digit', year: 'numeric', month: '2-digit', day: '2-digit' }); })()}</td>
        {showSentAtColumn && (
          <td>{repair.sent_at ? (() => { const d = new Date(repair.sent_at); d.setHours(d.getHours() + 7); return d.toLocaleString('ru-RU', { hour: '2-digit', minute: '2-digit', year: 'numeric', month: '2-digit', day: '2-digit' }); })() : ''}</td>
        )}
        {showClosedAt && (
          <td>{repair.closed_at ? (() => { const d = new Date(repair.closed_at); d.setHours(d.getHours() + 7); return d.toLocaleString('ru-RU', { hour: '2-digit', minute: '2-digit', year: 'numeric', month: '2-digit', day: '2-digit' }); })() : ''}</td>
        )}
        <td style={tdStyle[7]}>
          <select
            value={repair.status}
            onChange={(e) => handleStatusChange(repair.id, e.target.value)}
          >
            <option value="Неисправно">Неисправно</option>
            <option value="На отправке">На отправке</option>
            <option value="У курьера">У курьера</option>
            <option value="В ремонте">В ремонте</option>
            <option value="Закрыт">Закрыт</option>
          </select>
        </td>
      </tr>
    );
  };

  return (
    <div className={styles.container}>
      <h1 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <span>Администрирование заявок</span>
        <div className={styles.indicators} style={{ textAlign: 'right' }}>
          <p>Неисправно: {repairs.filter(r => r.status === 'Неисправно' && (!selectedAddress || r.club_address === selectedAddress)).length}</p>
          <p>На отправке: {repairs.filter(r => (r.status === 'На отправке' || r.status === 'У курьера') && (!selectedAddress || r.club_address === selectedAddress)).length}</p>
          <p>В ремонте: {repairs.filter(r => r.status === 'В ремонте' && (!selectedAddress || r.club_address === selectedAddress)).length}</p>
        </div>
      </h1>

      

      <div className={styles.tabs}>
        {statusTabs.map((tab) => (
          <button
            key={tab.value}
            className={`${styles.tabButton} ${activeTab === tab.value ? styles.activeTab : ''}`}
            onClick={() => setActiveTab(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className={styles.tabs}>
        {addressTabs.map((address) => (
          <button
            key={address}
            className={`${styles.tabButton} ${selectedAddress === address ? styles.activeTab : ''}`}
            onClick={() => setSelectedAddress(address)}
          >
            {address}
          </button>
        ))}
      </div>

      <table className={styles.table}>
        <thead>{renderTableHeader()}</thead>
        <tbody>
          {filteredRepairs.map((repair) => renderTableRow(repair))}
        </tbody>
      </table>

      <button onClick={() => router.push('/admin')} className={styles.backButton}>
        Назад
      </button>
    </div>
  );
}

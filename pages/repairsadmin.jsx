import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import styles from '../styles/RepairsAdmin.module.css';
import baseStyles from '../styles/Status.module.css';
import { useRouter } from 'next/router';
import { withAdminGuard } from '../lib/withAdminGuard';
import { useUser } from '../context/UserContext';

function RepairsAdminPage() {
  const [repairs, setRepairs] = useState([]);
  const [activeTab, setActiveTab] = useState('Неисправно');
  const [selectedAddress, setSelectedAddress] = useState('');
  const router = useRouter();

  const addressTabs = [
    'Все',
    'Киренского', 'Карамзина', 'Лесников', 'Мира',
    'Мартынова', 'Алексеева', 'Полигон', '9 мая'
  ];

  const { user } = useUser();


  const statusTabs = [
    { label: 'Все', value: 'Все' },
    { label: 'Неисправно', value: 'Неисправно' },
    { label: 'Ожидание', value: 'Ожидание' },
    { label: 'В офисе', value: 'В офисе' },
    { label: 'Доставка', value: 'Доставка' },
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
    fetchRepairs(); // 👈 сразу загружаем данные при открытии
  
    const interval = setInterval(() => {
      fetchRepairs(); // 👈 затем каждые 5 секунд
    }, 5000);
  
    return () => clearInterval(interval);
  }, []);
  
  

  useEffect(() => {
    const saved = localStorage.getItem('overviewAddress');
    if (saved) setSelectedAddress(saved);
    else setSelectedAddress('Все');
  }, []);

  const handleTabChange = (value) => {
    setActiveTab(value);
    localStorage.setItem('activeTab', value);
  };

  const handleSelectAddress = (address) => {
    setSelectedAddress(address);
    localStorage.setItem('overviewAddress', address);
  };
  

  const filteredRepairs = repairs.filter((repair) => {
    const matchesStatus =
      (activeTab === 'Все' && repair.status !== 'Закрыт') ||
      (activeTab === 'Неисправно' && repair.status === 'Неисправно') ||
      (activeTab === 'Ожидание' && (repair.status === 'На отправке' || repair.status === 'У курьера')) ||
      (activeTab === 'В офисе' && repair.status === 'В ремонте') ||
      (activeTab === 'Доставка' && (repair.status === 'Доставка в клуб' || repair.status === 'Принято в клубе')) ||
      (activeTab === 'Закрыт' && repair.status === 'Закрыт');

    const matchesAddress = selectedAddress === 'Все' || selectedAddress === '' || repair.club_address === selectedAddress;

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
  
      // логирование действия
      await supabase.from('logs').insert([
        {
          user_login: user?.login || 'неизвестно',
          action: 'Изменение статуса заявки',
          details: `ID: ${repairId}, новый статус: ${newStatus}`,
        }
      ]);
    }
  };
  

  const getStatusColor = (status) => {
    switch (status) {
      case 'Неисправно': return '#FFD700';
      case 'На отправке':
      case 'У курьера':
      case 'Доставка в клуб':
      case 'Принято в клубе': return '#87CEFA';
      case 'В ремонте': return '#FA8072';
      case 'Закрыт': return '#90EE90';
      default: return 'white';
    }
  };

  const showClosedAt = activeTab === 'Закрыт';
  const showSentAtColumn = activeTab === 'В офисе' || activeTab === 'Доставка' || activeTab === 'Закрыт';

  const renderTableHeader = () => (
    <tr>
      <th style={{ width: '5%' }}>ID</th>
      <th style={{ width: '10%' }}>Клуб</th>
      <th style={{ width: '5%' }}>ПК №</th>
      <th style={{ width: '10%' }}>Тип</th>
      <th style={{ width: '10%' }}>Модель</th>
      <th style={{ width: '20%' }}>Описание</th>
      <th style={{ width: '10%' }}>Создана</th>
      {showSentAtColumn && <th style={{ width: '10%' }}>Отправлена</th>}
      {showClosedAt && <th style={{ width: '10%' }}>Закрыта</th>}
      <th style={{ width: '10%' }}>Статус</th>
    </tr>
  );

  const renderTableRow = (repair) => (
    <tr key={repair.id}>
      <td>{repair.id}</td>
      <td>{repair.club_address}</td>
      <td>{repair.pc_number}</td>
      <td>{repair.equipment_type}</td>
      <td>{repair.model}</td>
      <td>{repair.description}</td>
      <td>{(() => {
        const d = new Date(repair.created_at);
        d.setHours(d.getHours() + 7);
        return d.toLocaleString('ru-RU', { hour: '2-digit', minute: '2-digit', year: 'numeric', month: '2-digit', day: '2-digit' });
      })()}</td>
      {showSentAtColumn && (
        <td>{repair.sent_at ? (() => {
          const d = new Date(repair.sent_at);
          d.setHours(d.getHours() + 7);
          return d.toLocaleString('ru-RU', { hour: '2-digit', minute: '2-digit', year: 'numeric', month: '2-digit', day: '2-digit' });
        })() : ''}</td>
      )}
      {showClosedAt && (
        <td>{repair.closed_at ? (() => {
          const d = new Date(repair.closed_at);
          d.setHours(d.getHours() + 7);
          return d.toLocaleString('ru-RU', { hour: '2-digit', minute: '2-digit', year: 'numeric', month: '2-digit', day: '2-digit' });
        })() : ''}</td>
      )}
      <td style={{ backgroundColor: getStatusColor(repair.status) }}>
        <select
          value={repair.status}
          onChange={(e) => handleStatusChange(repair.id, e.target.value)}
          style={{ backgroundColor: getStatusColor(repair.status), border: 'none', width: '100%' }}
        >
          <option value="Неисправно">Неисправно</option>
          <option value="На отправке">На отправке</option>
          <option value="У курьера">У курьера</option>
          <option value="В ремонте">В ремонте</option>
          <option value="Доставка в клуб">Доставка в клуб</option>
          <option value="Принято в клубе">Принято в клубе</option>
          <option value="Закрыт">Закрыт</option>
        </select>
      </td>
    </tr>
  );

  return (
    <div className={styles.container}>
        <div style={{ display: 'flex', gap: '10px' }}>
  <button onClick={() => router.push('/admin')} className={baseStyles.buttonBack}>
    Главная
  </button>
  <button onClick={() => router.push('/overview')} className={baseStyles.buttonBack}>
    Обзор
  </button>
</div>

<h1 className={styles.pageTitle}>Администрирование заявок</h1>
      <h1 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
      <div className={styles.indicatorRow}>
  <div className={styles.indicator}>Неисправно: {repairs.filter(r => r.status === 'Неисправно' && (!selectedAddress || r.club_address === selectedAddress)).length}</div>
  <div className={styles.indicator}>Доставка: {repairs.filter(r => (r.status === 'На отправке' || r.status === 'У курьера') && (!selectedAddress || r.club_address === selectedAddress)).length}</div>
  <div className={styles.indicator}>В офисе: {repairs.filter(r => r.status === 'В ремонте' && (!selectedAddress || r.club_address === selectedAddress)).length}</div>
</div>
      </h1>

      <div className={styles.tabs}>
  {statusTabs.map((tab) => {
    const count = repairs.filter((r) => {
      const matchesAddress = selectedAddress === 'Все' || selectedAddress === '' || r.club_address === selectedAddress;
      if (!matchesAddress) return false;

      switch (tab.value) {
        case 'Все':
          return r.status !== 'Закрыт';
        case 'Неисправно':
          return r.status === 'Неисправно';
        case 'Ожидание':
          return r.status === 'На отправке' || r.status === 'У курьера';
        case 'В офисе':
          return r.status === 'В ремонте';
        case 'Доставка':
          return r.status === 'Доставка в клуб' || r.status === 'Принято в клубе';
        case 'Закрыт':
          return r.status === 'Закрыт';
        default:
          return false;
      }
    }).length;

    return (
      <button
        key={tab.value}
        className={`${styles.tabButton} ${activeTab === tab.value ? styles.activeTab : ''}`}
        onClick={() => handleTabChange(tab.value)}
      >
        {tab.label} ({count})
      </button>
    );
  })}
</div>

      <div className={styles.tabs}>
        {addressTabs.map((address) => (
          <button
          key={address}
          className={`${styles.tabButton} ${selectedAddress === address ? styles.activeTab : ''}`}
          onClick={() => handleSelectAddress(address)}
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

export default withAdminGuard(RepairsAdminPage);

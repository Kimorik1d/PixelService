import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import styles from '../styles/Repairs.module.css';
import { useRouter } from 'next/router';
import { useUser } from '../context/UserContext';

export default function RepairsPage() {
  const [repairs, setRepairs] = useState([]);
  const [pcNumbers, setPcNumbers] = useState({});
  const [descriptions, setDescriptions] = useState({});
  const [activeTab, setActiveTab] = useState('Ожидание');
  const { user } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      fetchRepairs();
      const interval = setInterval(fetchRepairs, 5000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchRepairs = async () => {
    const { data, error } = await supabase.from('repairs').select('*');
    if (error) console.error('Ошибка при загрузке заявок:', error.message);
    else {
      setRepairs(data);
      setPcNumbers(data.reduce((acc, r) => ({ ...acc, [r.id]: r.pc_number }), {}));
      setDescriptions(data.reduce((acc, r) => ({ ...acc, [r.id]: r.description }), {}));
    }
  };

  const updateStatus = async (id, newStatus) => {
    const updateData = { status: newStatus };
    if (newStatus === 'Закрыт') {
      updateData.closed_at = new Date().toISOString();
    }

    const { error } = await supabase.from('repairs').update(updateData).eq('id', id);
    if (error) {
      console.error('Ошибка при обновлении статуса:', error.message);
    } else {
      await supabase.from('logs').insert([
        {
          user_login: user?.login || 'неизвестно',
          action: 'Изменение статуса заявки',
          details: `ID: ${id}, новый статус: ${newStatus}`,
        },
      ]);
      fetchRepairs();
    }
  };

  const updatePcNumber = async (id, newNumber) => {
    const oldRepair = repairs.find((r) => r.id === id);
    const oldPc = oldRepair?.pc_number;

    const { error } = await supabase.from('repairs').update({ pc_number: newNumber }).eq('id', id);
    if (error) {
      console.error('Ошибка при обновлении номера ПК:', error.message);
    } else {
      await supabase.from('logs').insert([
        {
          user_login: user?.login || 'неизвестно',
          action: 'Изменение номера ПК',
          details: `ID: ${id}, с "${oldPc}" на "${newNumber}"`,
        },
      ]);
      fetchRepairs();
    }
  };

  const updateDescription = async (id, newDescription) => {
    const oldRepair = repairs.find((r) => r.id === id);
    const oldDescription = oldRepair?.description;

    const { error } = await supabase.from('repairs').update({ description: newDescription }).eq('id', id);
    if (error) {
      console.error('Ошибка при обновлении описания:', error.message);
    } else {
      await supabase.from('logs').insert([
        {
          user_login: user?.login || 'неизвестно',
          action: 'Изменение описания заявки',
          details: `ID: ${id}, с "${oldDescription}" на "${newDescription}"`,
        },
      ]);
      fetchRepairs();
    }
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

  const renderDescriptionCell = (repair, editable = true) => {
    if (!editable) return <span style={{ whiteSpace: 'pre-wrap' }}>{repair.description}</span>;
    const value = descriptions[repair.id] || '';
    const handleBlur = () => {
      if (repair.description !== value) updateDescription(repair.id, value);
    };
    return (
      <textarea
        value={value}
        className={styles.inputInline}
        style={{ width: '100%', resize: 'vertical', minHeight: '40px', whiteSpace: 'pre-wrap' }}
        onChange={(e) => setDescriptions((prev) => ({ ...prev, [repair.id]: e.target.value }))}
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
    date.setHours(date.getHours() + 7);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  const renderTable = (title, filteredRepairs, actions) => (
    <div className={styles.tableSection}>
      <h2 className={styles.tableTitle}>{title}</h2>
      <table className={styles.table}>
        <colgroup>
          <col style={{ width: '10px' }} />
          <col style={{ width: '15px' }} />
          <col style={{ width: '10px' }} />
          <col style={{ width: '15px' }} />
          <col style={{ width: '15px' }} />
          <col style={{ width: '80px' }} />
          <col style={{ width: '20px' }} />
          {title !== 'Ожидание' && title !== 'На отправке' && <col style={{ width: '20px' }} />}
          {title !== 'Ожидание' && title !== 'На отправке' && title !== 'В ремонте' && title !== 'На получение' && <col style={{ width: '20px' }} />}
          <col style={{ width: '25px' }} />
          {title !== 'История' && <col style={{ width: '20px' }} />}
        </colgroup>
        <thead>
          <tr>
            <th>ID</th>
            <th>Клуб</th>
            <th>№ ПК</th>
            <th>Тип</th>
            <th>Модель</th>
            <th>Описание</th>
            <th>Создано</th>
            {title !== 'Ожидание' && title !== 'На отправке' && <th>Отправлено</th>}
            {title !== 'Ожидание' && title !== 'На отправке' && title !== 'В ремонте' && title !== 'На получение' && <th>Закрыто</th>}
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
              <td>{renderDescriptionCell(repair, title !== 'История')}</td>
              <td>{formatDateTime(repair.created_at)}</td>
              {title !== 'Ожидание' && title !== 'На отправке' && <td>{repair.sent_at ? formatDateTime(repair.sent_at) : ''}</td>}
              {title !== 'Ожидание' && title !== 'На отправке' && title !== 'В ремонте' && title !== 'На получение' && <td>{repair.closed_at ? formatDateTime(repair.closed_at) : ''}</td>}
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
    : ['Ожидание', 'На отправке', 'В ремонте', 'На получение', 'История'];

  const filteredByTab = {
    'Ожидание': filteredRepairs.filter((r) => r.status === 'Неисправно'),
    'На отправке': filteredRepairs.filter((r) => r.status === 'На отправке' || r.status === 'У курьера'),
    'В ремонте': filteredRepairs.filter((r) => r.status === 'В ремонте'),
    'На получение': filteredRepairs.filter((r) => r.status === 'Доставка в клуб' || r.status === 'Принято в клубе'),
    'История': filteredRepairs.filter((r) => r.status === 'Закрыт'),
  };

  const renderActions = (repair) => {
    if (user?.role === 'courier' && activeTab === 'На отправке' && repair.status === 'На отправке') {
      return <button onClick={() => updateStatus(repair.id, 'У курьера')}>Передано</button>;
    }
    if (activeTab === 'Ожидание') {
      return <button onClick={() => updateStatus(repair.id, 'На отправке')}>Отправлено</button>;
    }
    if (activeTab === 'На отправке' && repair.status === 'На отправке') {
      return <button onClick={() => updateStatus(repair.id, 'У курьера')}>Передано</button>;
    }
    if (activeTab === 'В ремонте') {
      return <button onClick={() => updateStatus(repair.id, 'Закрыт')}>Закрыть</button>;
    }
    if (activeTab === 'На получение' && repair.status === 'Доставка в клуб') {
      return <button onClick={() => updateStatus(repair.id, 'Принято в клубе')}>Принято</button>;
    }
    return null;
  };

  const statusCounts = {
    'Ожидание': filteredRepairs.filter((r) => r.status === 'Неисправно').length,
    'На отправке': filteredRepairs.filter((r) => r.status === 'На отправке' || r.status === 'У курьера').length,
    'В ремонте': filteredRepairs.filter((r) => r.status === 'В ремонте').length,
  };

  return (
    <div className={styles.container}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <h1 className={styles.title}>Список заявок</h1>
        <div className={styles.statusSummary} style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'right' }}>
          <span><strong>Ожидание:</strong> {statusCounts['Ожидание']}</span>
          <span><strong>На отправке:</strong> {statusCounts['На отправке']}</span>
          <span><strong>В ремонте:</strong> {statusCounts['В ремонте']}</span>
        </div>
      </div>

      <div className={styles.buttonContainer}>
        <button className={styles.backButton} onClick={() => router.push('/')}>На главную</button>
      </div>

      <div className={styles.tabs}>
  {tabOptions.map((tab) => (
    <button
      key={tab}
      className={`${styles.tabButton} ${activeTab === tab ? styles.activeTab : ''}`}
      onClick={() => setActiveTab(tab)}
    >
      {tab}
      {tab !== 'История' && ` (${filteredByTab[tab]?.length || 0})`}
    </button>
  ))}
</div>



      {renderTable(activeTab, filteredByTab[activeTab], renderActions)}
    </div>
  );
}

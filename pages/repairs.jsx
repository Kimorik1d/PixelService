import React, { useEffect, useState, useRef } from 'react';
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
  const [showHint, setShowHint] = useState(false);
  const [sortOrder, setSortOrder] = useState('desc'); // 'desc' = сначала новые, 'asc' = сначала старые


  const [toasts, setToasts] = useState([]);
  const previousRepairsRef = useRef([]);

  const showToast = (message) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  };

  const fetchRepairs = async () => {
    const { data, error } = await supabase.from('repairs').select('*');
    if (error) {
      console.error('Ошибка при загрузке заявок:', error.message);
      return;
    }
    previousRepairsRef.current.forEach(old => {
      const updated = data.find(r => r.id === old.id);
      if (updated && old.status !== updated.status) {
        showToast(`Заявка ID ${updated.id} изменила статус с ${old.status} на ${updated.status}`);
      }
    });
    previousRepairsRef.current = data;
    setRepairs(data);
    setPcNumbers(data.reduce((acc, r) => ({ ...acc, [r.id]: r.pc_number }), {}));
    setDescriptions(data.reduce((acc, r) => ({ ...acc, [r.id]: r.description }), {}));
  };

  useEffect(() => {
    if (!user) return;
    fetchRepairs();
    const interval = setInterval(fetchRepairs, 5000);
    return () => clearInterval(interval);
  }, [user]);

  const updateStatus = async (id, newStatus) => {
    const updateData = { status: newStatus };
    if (newStatus === 'Закрыт') updateData.closed_at = new Date().toISOString();
    const { error } = await supabase.from('repairs').update(updateData).eq('id', id);
    if (error) {
      console.error('Ошибка при обновлении статуса:', error.message);
      return;
    }
    await supabase.from('logs').insert([{
      user_login: user?.login || 'неизвестно',
      action: 'Изменение статуса заявки',
      details: `ID: ${id}, новый статус: ${newStatus}`
    }]);
    fetchRepairs();
  };

  const updatePcNumber = async (id, newNum) => {
    const old = repairs.find(r => r.id === id)?.pc_number;
    const { error } = await supabase.from('repairs').update({ pc_number: newNum }).eq('id', id);
    if (error) {
      console.error('Ошибка при обновлении номера ПК:', error.message);
      return;
    }
    await supabase.from('logs').insert([{
      user_login: user?.login || 'неизвестно',
      action: 'Изменение номера ПК',
      details: `ID: ${id}, с "${old}" на "${newNum}"`
    }]);
    showToast(`Номер ПК заявки ID ${id} изменён`);
    fetchRepairs();
  };

  const updateDescription = async (id, newDesc) => {
    const old = repairs.find(r => r.id === id)?.description;
    const { error } = await supabase.from('repairs').update({ description: newDesc }).eq('id', id);
    if (error) {
      console.error('Ошибка при обновлении описания заявки:', error.message);
      return;
    }
    await supabase.from('logs').insert([{
      user_login: user?.login || 'неизвестно',
      action: 'Изменение описания заявки',
      details: `ID: ${id}, c "${old}" на "${newDesc}"`
    }]);
    showToast(`Описание заявки ID ${id} обновлено`);
    fetchRepairs();
  };

  const renderPcNumberCell = (r, editable) => {
    if (!editable) return <span>{r.pc_number}</span>;
    const value = pcNumbers[r.id] || '';

    const isValid = (val) => {
      const int = parseInt(val, 10);
      return (
        (!isNaN(int) && int >= 0 && int <= 99 && /^\d+$/.test(val)) ||
        val === 'PS5' || val === 'PS4'
      );
    };

    const handleBlur = () => {
      if (r.pc_number === value) return;
      if (!isValid(value)) {
        showToast('Некорректный номер ПК. Укажите число от 0 до 99 или PS4/PS5.');
        setPcNumbers(prev => ({ ...prev, [r.id]: r.pc_number }));
        return;
      }
      updatePcNumber(r.id, value);
    };

    return (
      <input
        type="text"
        value={value}
        className={styles.inputInline}
        onChange={e => setPcNumbers(prev => ({ ...prev, [r.id]: e.target.value }))}
        onBlur={handleBlur}
      />
    );
  };

  const renderDescriptionCell = (r, editable) => {
    if (!editable) return <span style={{ whiteSpace: 'pre-wrap' }}>{r.description}</span>;
    const value = descriptions[r.id] || '';

    const handleBlur = () => {
      const trimmed = value.slice(0, 80);
      if (r.description === trimmed) return;
      updateDescription(r.id, trimmed);
    };

    return (
      <textarea
        value={value}
        className={styles.inputInline}
        maxLength={80}
        style={{ width: '100%', resize: 'vertical', minHeight: '40px', whiteSpace: 'pre-wrap' }}
        onChange={e => setDescriptions(prev => ({ ...prev, [r.id]: e.target.value }))}
        onBlur={handleBlur}
      />
    );
  };


  // Цветные бейджи статуса, с галочкой для approved
  const renderStatusBadge = (r) => {
    if (activeTab === 'На отправке' && r.status === 'У курьера') {
      const cls = styles.statusCourier;
      return (
        <span className={`${styles.statusBadge} ${cls}`}>{`У курьера${r.approved ? ' ✓' : ''}`}</span>
      );
    }
    const cls =
      r.status === 'Неисправно' ? styles.statusPending :
      r.status === 'У курьера'   ? styles.statusCourier :
      r.status === 'В ремонте'   ? styles.statusInRepair :
                                   styles.statusClosed;
    return <span className={`${styles.statusBadge} ${cls}`}>{r.status}</span>;
  };

  const renderActions = (r) => {
    if (user?.role === 'courier' && activeTab === 'На отправке' && r.status === 'На отправке')
      return <button onClick={() => updateStatus(r.id, 'У курьера')}>Передано</button>;
    if (activeTab === 'Ожидание')
      return <button onClick={() => updateStatus(r.id, 'На отправке')}>Отметить</button>;
    if (activeTab === 'На отправке' && r.status === 'На отправке')
      return <button onClick={() => updateStatus(r.id, 'У курьера')}>Передано</button>;
    if (activeTab === 'На получение' && r.status === 'Доставка в клуб')
      return <button onClick={() => updateStatus(r.id, 'Принято в клубе')}>Принято</button>;
    return null;
  };

  const filtered = repairs.filter(r => user?.role === 'courier' || r.club_address === user?.club_address);
  const tabs = user?.role === 'courier'
    ? ['На отправке']
    : ['Ожидание', 'На отправке', 'В ремонте', 'На получение', 'История'];
  const byTab = {
    'Ожидание': filtered.filter(r => r.status === 'Неисправно'),
    'На отправке': filtered.filter(r => ['На отправке', 'У курьера'].includes(r.status)),
    'В ремонте': filtered.filter(r => r.status === 'В ремонте'),
    'На получение': filtered.filter(r => ['Доставка в клуб', 'Принято в клубе'].includes(r.status)),
    'История': filtered.filter(r => r.status === 'Закрыт'),
  };

  const renderTable = (title, dataList) => (
    <div className={styles.tableSection}>
      <h2 className={styles.tableTitle}>{title}</h2>
      <div style={{ overflowX: 'auto' }}>
        <table className={styles.table} style={{ tableLayout: 'fixed', width: 'auto' }}>
          <colgroup>
            <col style={{ width: '90px' }} />
            <col style={{ width: '140px' }} />
            <col style={{ width: '80px' }} />
            <col style={{ width: '150px' }} />
            <col style={{ width: '220px' }} />
            <col style={{ width: '700px' }} />
            <col style={{ width: '120px' }} />
            {title !== 'Ожидание' && <col style={{ width: '120px' }} />}
            {title !== 'Ожидание' && title !== 'На отправке' && <col style={{ width: '120px' }} />}
            <col style={{ width: '120px' }} />
            {title !== 'История' && <col style={{ width: '10px' }} />}
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
              {title !== 'Ожидание' && <th>Отправлено</th>}
              {title === 'История' && <th>Закрыто</th>}
              <th>Статус</th>
              {title !== 'История' && <th>Действия</th>}
            </tr>
          </thead>
          <tbody>
            {dataList.map(r => (
              <tr key={r.id}>
                <td>{r.id}</td>
                <td>{r.club_address}</td>
                <td>{renderPcNumberCell(r, title !== 'История')}</td>
                <td>{r.equipment_type}</td>
                <td>{r.model}</td>
                <td>{renderDescriptionCell(r, title !== 'История')}</td>
                <td>{new Date(r.created_at).toLocaleString()}</td>
                {title !== 'Ожидание' && <td>{r.sent_at && new Date(r.sent_at).toLocaleString()}</td>}
                {title === 'История' && <td>{r.closed_at && new Date(r.closed_at).toLocaleString()}</td>}
                <td>{renderStatusBadge(r)}</td>
                {title !== 'История' && <td>{renderActions(r)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Список заявок</h1>
        {showHint && (
          <div className={styles.statusHint}>
            <p><strong>Статусы заявок:</strong></p>
            <ul>
              <li><strong>Неисправно</strong> — дистанционная проблема или пока не требует отправки.</li>
              <li><strong>На отправке</strong> — заявка отмечена на передачу курьеру.</li>
              <li><strong>У курьера</strong> — оборудование находится у курьера.</li>
              <li><strong>В ремонте</strong> — оборудование в ремонте в офисе.</li>
              <li><strong>Доставка в клуб</strong> — оборудование находится у курьера на доставке в клуб.</li>
              <li><strong>Принято в клубе</strong> — оборудование принято от курьера в клубе.</li>
              <li><strong>Закрыт</strong> — заявка завершена.</li>
            </ul>
          </div>
        )}
      </div>
  
      {/* Первый ряд */}
      <div className={styles.topRow}>
        <button className={styles.backButton} onClick={() => router.push('/')}>На главную</button>
  
        <button className={styles.toggleHintButton} onClick={() => setShowHint(prev => !prev)}>
          {showHint ? 'Скрыть подсказку' : 'Показать подсказку'}
        </button>
  
        <div className={styles.sortControls}>
          <label htmlFor="sortSelect" style={{ marginRight: '8px' }}>Сортировка:</label>
          <select
            id="sortSelect"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className={styles.sortSelect}
          >
            <option value="desc">Сначала новые</option>
            <option value="asc">Сначала старые</option>
          </select>
        </div>
      </div>
  
      {/* Второй ряд */}
      <div className={styles.tabRow}>
        {tabs.map(tab => (
          <button
            key={tab}
            className={`${styles.tabButton} ${activeTab === tab ? styles.activeTab : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab} ({byTab[tab].length})
          </button>
        ))}
      </div>
  
      {/* Таблица */}
      {renderTable(
        activeTab,
        [...byTab[activeTab]].sort((a, b) => {
          const aTime = new Date(a.created_at).getTime();
          const bTime = new Date(b.created_at).getTime();
          return sortOrder === 'asc' ? aTime - bTime : bTime - aTime;
        })
      )}
  
      {/* Тосты */}
      <div className={styles.toastContainer}>
        {toasts.map(t => (
          <div key={t.id} className={styles.toast}>{t.message}</div>
        ))}
      </div>
    </div>
  );
}

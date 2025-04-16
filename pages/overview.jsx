
// OverviewPage.jsx
import { useUser } from '../context/UserContext';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import baseStyles from '../styles/Status.module.css';
import styles from '../styles/Overview.module.css';
import { withAdminGuard } from '../lib/withAdminGuard';

function OverviewPage() {
  const { user } = useUser();
  const router = useRouter();
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [faultyPcs, setFaultyPcs] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState('');
  const [availableAddresses, setAvailableAddresses] = useState([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [layout, setLayout] = useState([]);
  const [draggingId, setDraggingId] = useState(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [hoverPcId, setHoverPcId] = useState(null);
  const [hoverPcRequests, setHoverPcRequests] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalPcId, setModalPcId] = useState(null);
  const [pcRequests, setPcRequests] = useState([]);
  const [clubStats, setClubStats] = useState({ Неисправно: 0, 'На отправке': 0, 'В ремонте': 0 });
  const [allClubStats, setAllClubStats] = useState({});
  const allAddresses = ['Киренского', 'Мира', 'Мартынова', '9 мая', 'Карамзина', 'Лесников', 'Полигон', 'Алексеева'];

  useEffect(() => {
    if (user === null) return;
    if (!user || user.role !== 'admin') {
      router.replace('/');
    } else {
      setCheckingAccess(false);
      fetchAddresses();
    }
  }, [user]);

  useEffect(() => {
    if (selectedAddress === 'Все') {
      fetchAllClubStats();
    } else if (selectedAddress) {
      fetchActiveRepairs(selectedAddress);
      fetchLayoutFromDB(selectedAddress);
      fetchClubStats(selectedAddress);
    }
  }, [selectedAddress]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (draggingId === null) return;
      const canvas = document.querySelector(`.${styles.canvas}`);
      const canvasRect = canvas.getBoundingClientRect();
      const newX = e.clientX - canvasRect.left - offset.x;
      const newY = e.clientY - canvasRect.top - offset.y;
      setLayout((prev) =>
        prev.map((el) =>
          el.id === draggingId ? { ...el, x: newX, y: newY } : el
        )
      );
    };
    const handleMouseUp = () => setDraggingId(null);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingId, offset]);

  const fetchAddresses = async () => {
    const { data, error } = await supabase
      .from('repairs')
      .select('club_address')
      .neq('status', 'Закрыт');
    if (error) return;
    const unique = [...new Set(data.map((r) => r.club_address))];
    setAvailableAddresses(unique);
    setSelectedAddress('Все');
  };

  const fetchAllClubStats = async () => {
    const { data, error } = await supabase
      .from('repairs')
      .select('club_address, status')
      .in('status', [
        'Неисправно',
        'На отправке',
        'У курьера',
        'В ремонте',
        'Доставка в клуб',
        'Принято в клубе',
      ]);
    if (error) return;
    const statsByClub = {};
    data.forEach((r) => {
      if (!statsByClub[r.club_address]) {
        statsByClub[r.club_address] = { Неисправно: 0, 'В офисе': 0 };
      }
      if (['Неисправно', 'На отправке', 'У курьера', 'Принято в клубе'].includes(r.status)) {
        statsByClub[r.club_address]['Неисправно']++;
      } else if (['В ремонте', 'Доставка в клуб'].includes(r.status)) {
        statsByClub[r.club_address]['В офисе']++;
      }
    });
    setAllClubStats(statsByClub);
  };

  const getCellColor = (count) => {
    if (count == 0) return '#4CAF50';
    if (count >= 1) return '#FFC107';
    return '#F44336';
  };

  const fetchActiveRepairs = async (address) => {
    const { data, error } = await supabase
      .from('repairs')
      .select('pc_number, status')
      .eq('club_address', address)
      .in('status', [
        'Неисправно',
        'На отправке',
        'У курьера',
        'В ремонте',
        'Доставка в клуб',
        'Принято в клубе',
      ]);
    if (error) return;
    setFaultyPcs(data.map((r) => String(r.pc_number)));
  };

  const fetchLayoutFromDB = async (address) => {
    const { data, error } = await supabase
      .from('pc_layouts')
      .select('layout')
      .eq('club_address', address)
      .single();
    if (error && error.code !== 'PGRST116') return;
    if (data?.layout) setLayout(data.layout);
    else {
      const defaultLayout = Array.from({ length: 50 }, (_, i) => ({
        id: `${i + 1}`,
        x: 100 + (i % 10) * 60,
        y: 100 + Math.floor(i / 10) * 60,
        type: 'pc',
      }));
      setLayout(defaultLayout);
    }
  };

  const fetchClubStats = async (address) => {
    const { data, error } = await supabase
      .from('repairs')
      .select('status')
      .eq('club_address', address)
      .in('status', ['Неисправно', 'На отправке', 'У курьера', 'В ремонте']);
    if (error) return;
    const stats = { Неисправно: 0, 'На отправке': 0, 'В ремонте': 0 };
    data.forEach((r) => {
      if (r.status === 'Неисправно') stats['Неисправно']++;
      else if (['На отправке', 'У курьера'].includes(r.status)) stats['На отправке']++;
      else if (r.status === 'В ремонте') stats['В ремонте']++;
    });
    setClubStats(stats);
  };

  const fetchPcRequests = async (pcId, forHover = false) => {
    const { data, error } = await supabase
      .from('repairs')
      .select('*')
      .eq('club_address', selectedAddress)
      .eq('pc_number', pcId)
      .neq('status', 'Закрыт');
    if (error) return;
    if (forHover) {
      setHoverPcRequests(data);
      setHoverPcId(pcId);
    } else {
      setModalPcId(pcId);
      setPcRequests(data);
      setModalVisible(true);
    }
  };

  const saveLayoutToDB = async () => {
    const { error } = await supabase
      .from('pc_layouts')
      .upsert({ club_address: selectedAddress, layout });
    if (error) console.error('Ошибка сохранения макета:', error);
  };

  const handleDragStart = (e, id) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setDraggingId(id);
  };

  const handlePcIdChange = (oldId, newId) => {
    setLayout((prev) =>
      prev.map((item) =>
        item.id === oldId ? { ...item, id: newId } : item
      )
    );
  };

  const handleDeleteItem = (id) => {
    setLayout((prev) => prev.filter((item) => item.id !== id));
  };


  const renderItem = (item) => {
    if (item.type === 'label') {
      return (
        <div
          key={item.id}
          className={styles.labelBox}
          style={{ left: item.x, top: item.y }}
          onMouseDown={isEditMode ? (e) => {
            if (e.target.tagName !== 'INPUT') handleDragStart(e, item.id);
          } : null}
        >
          {isEditMode ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <input
                value={item.text || ''}
                onChange={(e) => {
                  const newText = e.target.value;
                  setLayout((prev) =>
                    prev.map((el) => el.id === item.id ? { ...el, text: newText } : el)
                  );
                }}
                className={styles.labelInput}
              />
              <button onClick={() => handleDeleteItem(item.id)} style={{ color: 'red' }}>✕</button>
            </div>
          ) : (
            <span>{item.text}</span>
          )}
        </div>
      );
    }

    const isFaulty = faultyPcs.includes(item.id);
    return (
      <div
        key={item.id}
        className={`${styles.pcBox} ${isFaulty ? styles.faulty : styles.working}`}
        style={{ left: item.x, top: item.y, width: 50, height: 40 }}
        onMouseDown={isEditMode ? (e) => handleDragStart(e, item.id) : null}
        onClick={!isEditMode ? () => fetchPcRequests(item.id) : undefined}
        onMouseEnter={() => fetchPcRequests(item.id, true)}
        onMouseLeave={() => setHoverPcId(null)}
      >
        {isEditMode ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <input
              value={item.id}
              onChange={(e) => handlePcIdChange(item.id, e.target.value)}
              className={styles.pcInput}
              style={{ width: '40px', fontSize: '12px' }}
            />
            <button onClick={() => handleDeleteItem(item.id)} style={{ fontSize: '10px', marginTop: '2px', color: 'red', background: 'none', border: 'none', cursor: 'pointer' }}>
              ✕
            </button>
          </div>
        ) : (
          <span>{item.id}</span>
        )}
      </div>
    );
  };

  return (
    <div className={baseStyles.container}>
      {/* кнопки навигации */}
      <div style={{ position: 'absolute', top: 20, left: 30, display: 'flex', gap: '10px' }}>
        <button onClick={() => router.push('/admin')} className={baseStyles.buttonBack}>Главная</button>
        <button onClick={() => router.push('/repairsadmin')} className={baseStyles.buttonBack}>Таблица</button>
      </div>

      {/* статистика */}
      <div style={{ position: 'absolute', top: 20, right: 30, textAlign: 'right', lineHeight: '1.4' }}>
        <div><strong>Неисправно:</strong> {clubStats['Неисправно']}</div>
        <div><strong>На отправке:</strong> {clubStats['На отправке']}</div>
        <div><strong>В ремонте:</strong> {clubStats['В ремонте']}</div>
      </div>

      <h1 className={baseStyles.title}>Состояние ПК по клубам</h1>

      <div className={styles.tabs}>
        {['Все', ...allAddresses].map((address) => (
          <button
            key={address}
            className={`${styles.tabButton} ${selectedAddress === address ? styles.activeTab : ''}`}
            onClick={() => setSelectedAddress(address)}
          >
            {address}
          </button>
        ))}
      </div>
  
      {selectedAddress === 'Все' ? (
        <div className={styles.allTable}>
          <table>
            <thead>
              <tr>
                <th>Клуб</th>
                <th>Неисправно</th>
                <th>В офисе</th>
              </tr>
            </thead>
            <tbody>
  {allAddresses.map((club) => {
    const stats = allClubStats[club] || { 'Неисправно': 0, 'В офисе': 0 };
    return (
      <tr key={club}>
        <td>{club}</td>
        <td style={{ color: getCellColor(stats['Неисправно']), fontWeight: 'bold' }}>
          {stats['Неисправно']}
        </td>
        <td style={{ color: getCellColor(stats['В офисе']), fontWeight: 'bold' }}>
          {stats['В офисе']}
        </td>
      </tr>
    );
  })}
</tbody>

          </table>
        </div>
      ) : (
        <div className={styles.canvas}>
      {layout.map(renderItem)}
  
          {hoverPcId && hoverPcRequests.length > 0 && (
            <div
              className={styles.hoverCard}
              style={{
                position: 'absolute',
                left: layout.find(pc => pc.id === hoverPcId)?.x + 15,
                top: layout.find(pc => pc.id === hoverPcId)?.y - 10,
              }}
            >
              <strong>ПК {hoverPcId}</strong>
              <ul>
                {hoverPcRequests.map((r) => (
                  <li key={r.id}>{r.status} - {r.equipment_type}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
  
      {/* Модальное окно с заявками на ПК */}
      {modalVisible && (
  <div className={styles.modalOverlay} onClick={() => setModalVisible(false)}>
    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
      <h2>Заявки на ПК {modalPcId}</h2>
      {pcRequests.length === 0 ? (
        <p>Нет активных заявок</p>
      ) : (
        <ul>
          {pcRequests.map((r) => (
            <li key={r.id} style={{ marginBottom: '1em' }}>
            <div><strong>ID:</strong> {r.id}</div>
            <div><strong>Статус:</strong> {r.status}</div>
            <div><strong>Тип:</strong> {r.equipment_type}</div>
            <div><strong>Модель:</strong> {r.equipment_model}</div>
            <div><strong>Описание:</strong> {r.description || '—'}</div>
            <div><strong>Создано:</strong> {new Date(new Date(r.created_at).getTime() + 7 * 60 * 60 * 1000).toLocaleString('ru-RU')}</div>
          </li>
          
          ))}
        </ul>
      )}
      <button onClick={() => setModalVisible(false)}>Закрыть</button>
    </div>
  </div>
  
)}
<div style={{ textAlign: 'center', marginTop: '40px', display: 'flex', justifyContent: 'center', gap: '10px' }}>
        <button
          onClick={() => {
            const newLabel = {
              id: `label-${Date.now()}`,
              x: 100,
              y: 100,
              type: 'label',
              text: 'Надпись',
            };
            setLayout((prev) => [...prev, newLabel]);
          }}
          className={baseStyles.button}
        >
          ➕ Добавить надпись
        </button>
        <button
          onClick={() => {
            const newId = (layout.length + 1).toString();
            const newPc = { id: newId, x: 100, y: 100, type: 'pc' };
            setLayout((prev) => [...prev, newPc]);
          }}
          className={baseStyles.button}
        >
          ➕ Добавить ПК
        </button>
        <button
          onClick={() => {
            if (isEditMode) saveLayoutToDB();
            setIsEditMode(!isEditMode);
          }}
          className={baseStyles.button}
        >
          {isEditMode ? 'Сохранить' : 'Редактировать'}
        </button>
      </div>
    </div>
  );
}

export default withAdminGuard(OverviewPage);

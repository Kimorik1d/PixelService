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
  const [modalVisible, setModalVisible] = useState(false);
  const [modalPcId, setModalPcId] = useState(null);
  const [pcRequests, setPcRequests] = useState([]);
  const [clubStats, setClubStats] = useState({ Неисправно: 0, 'На отправке': 0, 'В ремонте': 0 });
  const [editIds, setEditIds] = useState({});

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
    if (selectedAddress) {
      console.log('🧭 Вкладка:', selectedAddress);
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
    setSelectedAddress(unique[0] || '');
  };

  const fetchActiveRepairs = async (address) => {
    const { data, error } = await supabase
      .from('repairs')
      .select('pc_number, status')
      .eq('club_address', address)
      .in('status', ['Неисправно', 'На отправке', 'У курьера', 'В ремонте']);
  
    if (error) {
      console.error('❌ Ошибка при загрузке заявок:', error.message);
      return;
    }
  
    console.log('🔧 Активные заявки для', address, ':', data);
    setFaultyPcs(data.map((r) => String(r.pc_number))); // 👈 Приведение к строкам
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
        x: 100 + (i % 10) * 80,
        y: 100 + Math.floor(i / 10) * 80,
        type: 'pc',
      }));
      setLayout(defaultLayout);
    }
    console.log('🧱 Макет для', address, ':', data?.layout?.map((el) => el.id));

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
      else if (r.status === 'На отправке' || r.status === 'У курьера') stats['На отправке']++;
      else if (r.status === 'В ремонте') stats['В ремонте']++;
    });
    setClubStats(stats);
  };

  const fetchPcRequests = async (pcId) => {
    const { data, error } = await supabase
      .from('repairs')
      .select('*')
      .eq('club_address', selectedAddress)
      .eq('pc_number', pcId);

    if (error) return;
    setModalPcId(pcId);
    setPcRequests(data);
    setModalVisible(true);
  };

  const saveLayoutToDB = async () => {
    const { error } = await supabase
      .from('pc_layouts')
      .upsert({ club_address: selectedAddress, layout });

    if (!error) alert('Макет сохранён');
  };

  const handleDeletePc = (id) => {
    setLayout((prev) => prev.filter((el) => el.id !== id));
  };

  const handleAddPc = () => {
    const nextId = `${layout.length + 1}`;
    setLayout((prev) => [...prev, { id: nextId, x: 200, y: 200, type: 'pc' }]);
  };

  const handleAddLabel = () => {
    const nextId = `label-${layout.filter((l) => l.type === 'label').length + 1}`;
    setLayout((prev) => [...prev, { id: nextId, x: 250, y: 250, type: 'label', text: 'Надпись' }]);
  };

  const handleDragStart = (e, id) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setDraggingId(id);
  };

  const handleChangeId = (oldId, newId) => {
    const trimmed = newId.trim();
    if (!trimmed) return;
    setLayout((prev) => {
      const exists = prev.some((pc) => pc.id === trimmed);
      if (exists) return prev;
      return prev.map((pc) => (pc.id === oldId ? { ...pc, id: trimmed } : pc));
    });
    setEditIds((prev) => ({ ...prev, [oldId]: false }));
  };

  const pcsInLayout = layout.filter((pc) => pc.type === 'pc').map((pc) => pc.id);
  const uniqueFaulty = [...new Set(faultyPcs)];
  const faultyCount = pcsInLayout.filter((id) => uniqueFaulty.includes(id)).length;
  const workingCount = pcsInLayout.length - faultyCount;
  
  

  if (checkingAccess) return null;

  return (
    <div className={baseStyles.container}>
      <div style={{ position: 'absolute', top: 20, right: 30, textAlign: 'right', lineHeight: '1.4' }}>
        <div><strong>Неисправно:</strong> {clubStats['Неисправно']}</div>
        <div><strong>На отправке:</strong> {clubStats['На отправке']}</div>
        <div><strong>В ремонте:</strong> {clubStats['В ремонте']}</div>
      </div>

      <h1 className={baseStyles.title}>Состояние ПК по клубам</h1>

      <div className={styles.tabs}>
        {['Мира', 'Киренского', 'Мартынова', 'Карамзина', '9 мая', 'Алексеева', 'Полигон', 'Лесников'].map((address) => (
          <button
            key={address}
            className={`${styles.tabButton} ${selectedAddress === address ? styles.activeTab : ''}`}
            onClick={() => setSelectedAddress(address)}
          >
            {address}
          </button>
        ))}
      </div>

      <div className={styles.legend}>
  <div className={styles.legendItem}>
    <div className={`${styles.colorBox} ${styles.working}`} />
    <span>Исправен ({workingCount})</span>
  </div>
  <div className={styles.legendItem}>
    <div className={`${styles.colorBox} ${styles.faulty}`} />
    <span>Неисправен ({faultyCount})</span>
  </div>
</div>


      <div className={styles.canvas}>
        {layout.map((item) => {
          if (item.type === 'label') {
            return (
              <div
                key={item.id}
                className={styles.labelBox}
                style={{ left: item.x, top: item.y }}
                onMouseDown={isEditMode ? (e) => handleDragStart(e, item.id) : null}
              >
                {isEditMode ? (
                  <input
                    value={item.text}
                    onChange={(e) => {
                      const newText = e.target.value;
                      setLayout((prev) =>
                        prev.map((el) => el.id === item.id ? { ...el, text: newText } : el)
                      );
                    }}
                    className={styles.labelInput}
                  />
                ) : (
                  <span>{item.text}</span>
                )}
                {isEditMode && (
                  <button className={styles.deleteButton} onClick={() => handleDeletePc(item.id)}>✖</button>
                )}
              </div>
            );
          }

          const isFaulty = faultyPcs.includes(item.id);
          return (
            <div
              key={item.id}
              className={`${styles.pcBox} ${isFaulty ? styles.faulty : styles.working}`}
              style={{ left: item.x, top: item.y }}
              onMouseDown={isEditMode ? (e) => handleDragStart(e, item.id) : null}
              onClick={!isEditMode ? () => fetchPcRequests(item.id) : undefined}
            >
              {isEditMode && editIds[item.id] ? (
                <input
                  type="text"
                  value={item.id}
                  onChange={(e) => handleChangeId(item.id, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleChangeId(item.id, e.target.value);
                    else if (e.key === 'Escape') setEditIds((prev) => ({ ...prev, [item.id]: false }));
                  }}
                  onBlur={() => setEditIds((prev) => ({ ...prev, [item.id]: false }))}
                  className={styles.inputEdit}
                />
              ) : (
                <span onDoubleClick={() => setEditIds((prev) => ({ ...prev, [item.id]: true }))}>
                  {item.id}
                </span>
              )}
              {isEditMode && (
                <button className={styles.deleteButton} onClick={() => handleDeletePc(item.id)}>✖</button>
              )}
            </div>
          );
        })}
      </div>

      {modalVisible && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3>Заявки для {modalPcId}</h3>
            {pcRequests.length === 0 ? (
              <p>Нет заявок</p>
            ) : (
              <ul>
                {pcRequests.map((req) => (
                  <li key={req.id}>
                    <strong>ID:</strong> {req.id} <br />
                    <strong>Статус:</strong> {req.status} <br />
                    <strong>Тип:</strong> {req.equipment_type} <br />
                    <strong>Модель:</strong> {req.model} <br />
                    <strong>Описание:</strong> {req.description} <br />
                    <small>{new Date(req.created_at).toLocaleString()}</small>
                  </li>
                ))}
              </ul>
            )}
            <div className={styles.modalActions}>
              <button onClick={() => setModalVisible(false)}>Закрыть</button>
            </div>
          </div>
        </div>
      )}

      <div className={baseStyles.buttonContainer} style={{ marginTop: '30px' }}>
        <button className={baseStyles.buttonBack} onClick={() => router.push('/admin')}>Назад</button>
        <button
          className={baseStyles.buttonBack}
          onClick={() => setIsEditMode(!isEditMode)}
          style={{ marginLeft: '10px', backgroundColor: isEditMode ? '#999' : '#1e90ff' }}
        >
          {isEditMode ? 'Завершить редактирование' : 'Редактировать'}
        </button>
        {isEditMode && (
          <>
            <button
              className={baseStyles.buttonBack}
              onClick={handleAddPc}
              style={{ marginLeft: '10px', backgroundColor: '#28a745' }}
            >
              Добавить ПК
            </button>
            <button
              className={baseStyles.buttonBack}
              onClick={handleAddLabel}
              style={{ marginLeft: '10px', backgroundColor: '#6f42c1' }}
            >
              Добавить надпись
            </button>
            <button
              className={baseStyles.buttonBack}
              onClick={saveLayoutToDB}
              style={{ marginLeft: '10px', backgroundColor: '#ffc107' }}
            >
              Сохранить макет
            </button>
          </>
        )}
      </div>
    </div>
  );
}
export default withAdminGuard(OverviewPage);
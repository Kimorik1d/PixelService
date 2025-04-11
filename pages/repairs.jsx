import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import styles from '../styles/Repairs.module.css';
import { useRouter } from 'next/router';
import { useUser } from '../context/UserContext';

export default function RepairsPage() {
  const [repairs, setRepairs] = useState([]);
  const [pcNumbers, setPcNumbers] = useState({});
  const [descriptions, setDescriptions] = useState({});
  const [sortDirection, setSortDirection] = useState('newest');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedRepairId, setSelectedRepairId] = useState(null);
  const [showAllHistory, setShowAllHistory] = useState(false);
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
      setDescriptions(data.reduce((acc, r) => ({ ...acc, [r.id]: r.description }), {}));
    }
  };

  const updateStatus = async (id, newStatus) => {
    const updateData = { status: newStatus };
    if (newStatus === 'Закрыт') {
      updateData.closed_at = new Date().toISOString();
    }
    const { error } = await supabase.from('repairs').update(updateData).eq('id', id);
    if (error) console.error('Ошибка при обновлении статуса:', error.message);
    else fetchRepairs();
  };

  const updatePcNumber = async (id, newNumber) => {
    const { error } = await supabase.from('repairs').update({ pc_number: newNumber }).eq('id', id);
    if (error) console.error('Ошибка при обновлении номера ПК:', error.message);
    else fetchRepairs();
  };

  const updateDescription = async (id, newDescription) => {
    const { error } = await supabase.from('repairs').update({ description: newDescription }).eq('id', id);
    if (error) console.error('Ошибка при обновлении описания:', error.message);
    else fetchRepairs();
  };

  const renderDescriptionCell = (repair, editable = true) => {
    if (!editable) return <span>{repair.description}</span>;

    const value = descriptions[repair.id] || '';
    const handleBlur = () => {
      if (repair.description !== value) updateDescription(repair.id, value);
    };

    return (
      <textarea
        value={value}
        className={styles.textareaAutosize}
        onChange={(e) => {
          const el = e.target;
          el.style.height = 'auto';
          el.style.height = `${el.scrollHeight}px`;
          setDescriptions((prev) => ({ ...prev, [repair.id]: el.value }));
        }}
        onBlur={handleBlur}
        rows={2}
      />
    );
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
        maxLength={2}
        value={value}
        className={styles.inputInline}
        onChange={(e) => setPcNumbers((prev) => ({ ...prev, [repair.id]: e.target.value }))}
        onBlur={handleBlur}
      />
    );
  };

  const renderStatusCell = (repair, editable = true) => {
    const handleChange = (e) => updateStatus(repair.id, e.target.value);
    const statusClass =
      repair.status === 'Ожидает' ? styles.statusPending :
      repair.status === 'В ремонте' ? styles.statusInRepair :
      repair.status === 'Закрыт' ? styles.statusClosed :
      repair.status === 'У курьера' ? styles.statusCourier : '';

    if (!editable) {
      return <span className={`${styles.statusBadge} ${statusClass}`}>{repair.status}</span>;
    }

    return (
      <select
        value={repair.status}
        onChange={handleChange}
        className={`${styles.statusSelect} ${statusClass}`}
      >
        <option value="Ожидает">Ожидает</option>
        <option value="В ремонте">В ремонте</option>
        <option value="У курьера">У курьера</option>
      </select>
    );
  };

  const openCloseModal = (repairId) => {
    setSelectedRepairId(repairId);
    setModalVisible(true);
  };

  const confirmClose = () => {
    if (selectedRepairId) {
      updateStatus(selectedRepairId, 'Закрыт');
      setModalVisible(false);
      setSelectedRepairId(null);
    }
  };

  const cancelClose = () => {
    setModalVisible(false);
    setSelectedRepairId(null);
  };

  const renderTable = (title, filteredRepairs) => (
    <div className={`${styles.tableSection} ${title === 'История заявок' ? styles.history : ''}`}>
      <h2 className={styles.tableTitle}>{title}</h2>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Клуб</th>
            <th>Описание</th>
            <th>Номер ПК</th>
            <th>Тип оборудования</th>
            <th>Модель</th>
            <th>Статус</th>
            {title === 'История заявок' && <th>Дата закрытия</th>}
            <th>Дата создания</th>
            {title === 'Заявки в ремонте' && <th>Действие</th>}
          </tr>
        </thead>
        <tbody>
          {filteredRepairs.map((repair) => (
            <tr key={repair.id}>
              <td>{repair.club_address}</td>
              <td>{renderDescriptionCell(repair, title !== 'История заявок')}</td>
              <td>{renderPcNumberCell(repair, title !== 'История заявок')}</td>
              <td>{repair.equipment_type}</td>
              <td>{repair.model}</td>
              <td>{renderStatusCell(repair, title !== 'История заявок')}</td>
              {title === 'История заявок' && (
                <td>{repair.closed_at ? new Date(repair.closed_at).toLocaleDateString() : ''}</td>
              )}
              <td>{new Date(repair.created_at).toLocaleDateString()}</td>
              {title === 'Заявки в ремонте' && (
                <td>
                  <button className={styles.closeButton} onClick={() => openCloseModal(repair.id)}>
                    Закрыть
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {title === 'История заявок' && (
        <div style={{ marginTop: '10px', textAlign: 'center' }}>
          <button onClick={() => setShowAllHistory((prev) => !prev)}>
            {showAllHistory ? 'Скрыть' : 'Показать все'}
          </button>
        </div>
      )}
    </div>
  );

  const filteredRepairs = repairs
    .filter(r => r.club_address === user?.club_address)
    .sort((a, b) => {
      const dateA = new Date(a.created_at);
      const dateB = new Date(b.created_at);
      return sortDirection === 'newest' ? dateB - dateA : dateA - dateB;
    });

  const visibleHistory = filteredRepairs
    .filter((r) => r.status === 'Закрыт')
    .slice(0, showAllHistory ? undefined : 5);

  return (
    <div className={styles.container}>
      <div className={styles.topControls}>
        <button className={styles.backButton} onClick={() => router.push('/')}>На главную</button>
        <div className={styles.sortContainer}>
          <label style={{ marginRight: '10px' }}>Сортировка:</label>
          <select value={sortDirection} onChange={(e) => setSortDirection(e.target.value)}>
            <option value="newest">Сначала новые</option>
            <option value="oldest">Сначала старые</option>
          </select>
        </div>
      </div>

      <h1 className={styles.title}>Список заявок</h1>

      {renderTable('Заявки в ожидании', filteredRepairs.filter((r) => r.status === 'Ожидает'))}
      {renderTable('Заявки в ремонте', filteredRepairs.filter((r) => r.status === 'В ремонте' || r.status === 'У курьера'))}
      {renderTable('История заявок', visibleHistory)}

      {modalVisible && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3>Подтверждение</h3>
            <p>Вы уверены, что хотите закрыть эту заявку?</p>
            <div className={styles.modalActions}>
              <button className={styles.confirmButton} onClick={confirmClose}>Да, закрыть</button>
              <button className={styles.cancelButton} onClick={cancelClose}>Отмена</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

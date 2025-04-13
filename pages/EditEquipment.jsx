import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useRouter } from 'next/router';
import styles from '../styles/EditEquipment.module.css';
import { useUser } from '../context/UserContext';

export default function EditEquipment() {
  const [clubs, setClubs] = useState([]);
  const [selectedClubAddress, setSelectedClubAddress] = useState('');
  const [newClub, setNewClub] = useState('');

  const [equipmentTypes, setEquipmentTypes] = useState([]);
  const [selectedTypeId, setSelectedTypeId] = useState(null);
  const [newType, setNewType] = useState('');

  const [clubTypes, setClubTypes] = useState([]);

  const [models, setModels] = useState([]);
  const [newModel, setNewModel] = useState('');

  const router = useRouter();
  const { user } = useUser();

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.replace('/');
    } else {
      fetchClubs();
      fetchEquipmentTypes();
    }
  }, [user]);

  useEffect(() => {
    if (selectedClubAddress) fetchClubTypes(selectedClubAddress);
  }, [selectedClubAddress]);

  useEffect(() => {
    if (selectedTypeId) fetchModelsForType(selectedTypeId);
  }, [selectedTypeId]);

  const fetchClubs = async () => {
    const { data, error } = await supabase.from('clubs').select('*');
    if (error) console.error('Ошибка загрузки клубов:', error);
    else setClubs(data);
  };

  const fetchEquipmentTypes = async () => {
    const { data, error } = await supabase.from('equipment_types').select('*');
    if (error) console.error('Ошибка загрузки типов:', error);
    else setEquipmentTypes(data);
  };

  const fetchClubTypes = async (clubAddress) => {
    const { data, error } = await supabase
      .from('club_equipment_types')
      .select('equipment_type_id, equipment_types(name)')
      .eq('club_address', clubAddress);
    if (error) console.error('Ошибка загрузки типов клуба:', error);
    else setClubTypes(data);
  };

  const fetchModelsForType = async (typeId) => {
    const { data, error } = await supabase
      .from('equipment_models')
      .select('*')
      .eq('type_id', typeId);
    if (error) console.error('Ошибка загрузки моделей:', error);
    else setModels(data);
  };

  const handleAddClub = async () => {
    if (!newClub.trim()) return;
    const { error } = await supabase.from('clubs').insert({ name: newClub });
    if (error) alert('Ошибка при добавлении клуба: ' + error.message);
    else {
      setNewClub('');
      fetchClubs();
    }
  };

  const handleAddType = async () => {
    if (!newType.trim()) return;
    const { data, error } = await supabase
      .from('equipment_types')
      .insert({ name: newType })
      .select();
    if (error) alert('Ошибка при добавлении типа: ' + error.message);
    else {
      setNewType('');
      fetchEquipmentTypes();
      if (selectedClubAddress) handleAttachTypeToClub(data[0].id);
    }
  };

  const handleAttachTypeToClub = async (typeId) => {
    const { error } = await supabase
      .from('club_equipment_types')
      .insert({ club_address: selectedClubAddress, equipment_type_id: typeId });
    if (error) alert('Ошибка при привязке типа к клубу: ' + error.message);
    else fetchClubTypes(selectedClubAddress);
  };

  const handleAddModel = async () => {
    if (!selectedTypeId || !newModel.trim()) return;

    const { data, error } = await supabase
      .from('equipment_models')
      .insert({ type_id: selectedTypeId, model_name: newModel })
      .select();

    if (error) {
      alert('Ошибка при добавлении модели: ' + error.message);
    } else {
      const modelId = data[0].id;

      const { error: linkError } = await supabase
        .from('club_equipment_models')
        .insert({ club_address: selectedClubAddress, equipment_model_id: modelId });

      if (linkError) {
        alert('Ошибка при привязке модели к клубу: ' + linkError.message);
      } else {
        setNewModel('');
        fetchModelsForType(selectedTypeId);
      }
    }
  };

  if (!user || user.role !== 'admin') return null;

  return (
    <div className={styles.container}>
      <h1>Редактирование номенклатуры</h1>

      <div className={styles.formGroup}>
        <label>Добавить клуб</label>
        <input
          value={newClub}
          onChange={(e) => setNewClub(e.target.value)}
          placeholder="Например: Мира"
        />
        <button onClick={handleAddClub}>Добавить клуб</button>
      </div>

      <div className={styles.formGroup}>
        <label>Выбрать клуб</label>
        <select
          value={selectedClubAddress}
          onChange={(e) => setSelectedClubAddress(e.target.value)}
        >
          <option value=''>-- Выберите клуб --</option>
          {clubs.map((club) => (
            <option key={club.name} value={club.name}>{club.name}</option>
          ))}
        </select>
      </div>

      {selectedClubAddress && (
        <>
          <div className={styles.formGroup}>
            <label>Добавить тип оборудования для клуба</label>
            <input
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              placeholder="Например: Мышь"
            />
            <button onClick={handleAddType}>Добавить тип</button>
          </div>

          <div className={styles.formGroup}>
            <label>Типы оборудования клуба</label>
            <select
              value={selectedTypeId || ''}
              onChange={(e) => setSelectedTypeId(e.target.value)}
            >
              <option value=''>-- Выберите тип --</option>
              {clubTypes.map((ct) => (
                <option key={ct.equipment_type_id} value={ct.equipment_type_id}>
                  {ct.equipment_types.name}
                </option>
              ))}
            </select>
          </div>
        </>
      )}

      {selectedTypeId && (
        <div className={styles.formGroup}>
          <label>Добавить модель</label>
          <input
            value={newModel}
            onChange={(e) => setNewModel(e.target.value)}
            placeholder="Например: G102"
          />
          <button onClick={handleAddModel}>Добавить модель</button>

          <h3>Модели:</h3>
          <ul>
            {models.map((model) => (
              <li key={model.id}>{model.model_name}</li>
            ))}
          </ul>
        </div>
      )}

      <div className={styles.buttonContainer}>
        <button className={styles.buttonBack} onClick={() => router.push('/admin')}>
          Назад
        </button>
      </div>
    </div>
  );
}

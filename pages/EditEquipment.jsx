import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useRouter } from 'next/router';
import styles from '../styles/EditEquipment.module.css';
import { useUser } from '../context/UserContext';
import { withAdminGuard } from '../lib/withAdminGuard';

function EditEquipment() {
  const [clubs, setClubs] = useState([]);
  const [selectedClubAddress, setSelectedClubAddress] = useState('');
  const [newClub, setNewClub] = useState('');

  const [equipmentTypes, setEquipmentTypes] = useState([]);
  const [selectedTypeId, setSelectedTypeId] = useState(null);
  const [newType, setNewType] = useState('');
  const [selectedTreeClub, setSelectedTreeClub] = useState('');
  


  const [clubTypes, setClubTypes] = useState([]);
  const [models, setModels] = useState([]);
  const [newModel, setNewModel] = useState('');

  const [clubEquipmentTree, setClubEquipmentTree] = useState([]);

  const router = useRouter();
  const { user } = useUser();

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.replace('/');
    } else {
      fetchClubs();
      fetchEquipmentTypes();
      fetchClubEquipmentTree();
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

  const fetchClubEquipmentTree = async () => {
    const { data: clubs, error: clubsError } = await supabase.from('clubs').select('*');
    if (clubsError) {
      console.error('Ошибка загрузки клубов:', clubsError);
      return;
    }

    const tree = [];

    for (const club of clubs) {
      const { data: clubTypes, error: typesError } = await supabase
        .from('club_equipment_types')
        .select('equipment_type_id, equipment_types(name)')
        .eq('club_address', club.name);

      if (typesError) {
        console.error(`Ошибка типов для ${club.name}:`, typesError);
        continue;
      }

      const typesWithModels = [];

      for (const ct of clubTypes) {
        const { data: models, error: modelsError } = await supabase
          .from('club_equipment_models')
          .select('equipment_model_id, equipment_models(model_name, type_id)')
          .eq('club_address', club.name);

        if (modelsError) {
          console.error(`Ошибка моделей для ${club.name}`, modelsError);
          continue;
        }

        const filteredModels = models.filter(
          (m) =>
            m.equipment_models &&
            m.equipment_models.model_name &&
            m.equipment_models.type_id === ct.equipment_type_id
        );

        typesWithModels.push({
          id: ct.equipment_type_id,
          name: ct.equipment_types.name,
          models: filteredModels.map((m) => ({
            id: m.equipment_model_id,
            name: m.equipment_models.model_name,
          })),
        });
      }

      tree.push({
        club: club.name,
        types: typesWithModels,
      });
    }

    setClubEquipmentTree(tree);
  };

  const handleAddClub = async () => {
    if (!newClub.trim()) return;
    const { error } = await supabase.from('clubs').insert({ name: newClub });
    if (error) alert('Ошибка при добавлении клуба: ' + error.message);
    else {
      setNewClub('');
      fetchClubs();
      fetchClubEquipmentTree();
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
    else {
      fetchClubTypes(selectedClubAddress);
      fetchClubEquipmentTree();
    }
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
        fetchClubEquipmentTree();
      }
    }
  };

  if (!user || user.role !== 'admin') return null;

  return (
    <div className={styles.content}>
      {/* Левая панель — формы */}
      <div className={styles.leftPanel}>
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

      {/* Правая панель — дерево */}
{/* Правая панель — дерево с выбором клуба */}
<div className={styles.rightPanel}>
  <h2>Номенклатура по клубам</h2>

  <div className={styles.formGroup}>
    <label>Показать клуб</label>
    <select
      value={selectedTreeClub}
      onChange={(e) => setSelectedTreeClub(e.target.value)}
    >
      <option value=''>Все клубы</option>
      {clubEquipmentTree.map((club) => (
        <option key={club.club} value={club.club}>{club.club}</option>
      ))}
    </select>
  </div>

  {clubEquipmentTree
    .filter((club) => !selectedTreeClub || club.club === selectedTreeClub)
    .map((club) => (
      <div key={club.club} className={styles.treeClub}>
        <strong>{club.club}</strong>
        <ul>
          {club.types.map((type) => (
            <li key={type.id}>
              {type.name}
              <ul>
                {type.models.map((model) => (
                  <li key={model.id}>{model.name}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </div>
    ))}
</div>

    </div>
  );
}

export default withAdminGuard(EditEquipment);

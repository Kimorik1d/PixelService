import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useRouter } from 'next/router';
import styles from '../styles/EditEquipment.module.css';
import { useUser } from '../context/UserContext'; // 👈 добавлен импорт контекста

export default function EditEquipment() {
  const [equipmentTypes, setEquipmentTypes] = useState([]);
  const [selectedTypeId, setSelectedTypeId] = useState(null);
  const [newType, setNewType] = useState('');
  const [newModel, setNewModel] = useState('');
  const [models, setModels] = useState([]);
  const router = useRouter();
  const { user } = useUser(); // 👈 получаем пользователя

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.replace('/');
    } else {
      fetchEquipmentTypes();
    }
  }, [user]);

  useEffect(() => {
    if (selectedTypeId) fetchModelsForType(selectedTypeId);
  }, [selectedTypeId]);

  const fetchEquipmentTypes = async () => {
    const { data, error } = await supabase.from('equipment_types').select('*');
    if (error) console.error('Ошибка загрузки типов оборудования:', error);
    else setEquipmentTypes(data);
  };

  const fetchModelsForType = async (typeId) => {
    const { data, error } = await supabase
      .from('equipment_models')
      .select('*')
      .eq('type_id', typeId);
    if (error) console.error('Ошибка загрузки моделей:', error);
    else setModels(data);
  };

  const handleAddType = async () => {
    if (!newType.trim()) return;
    const { error } = await supabase.from('equipment_types').insert({ name: newType });
    if (error) alert('Ошибка при добавлении типа: ' + error.message);
    else {
      setNewType('');
      fetchEquipmentTypes();
    }
  };

  const handleAddModel = async () => {
    if (!selectedTypeId || !newModel.trim()) return;
    const { error } = await supabase
      .from('equipment_models')
      .insert({ type_id: selectedTypeId, model_name: newModel });
    if (error) alert('Ошибка при добавлении модели: ' + error.message);
    else {
      setNewModel('');
      fetchModelsForType(selectedTypeId);
    }
  };

  // 👇 если нет доступа — ничего не рендерим
  if (!user || user.role !== 'admin') return null;

  return (
    <div className={styles.container}>
      <h1>Редактирование номенклатуры</h1>

      <div className={styles.formGroup}>
        <label>Добавить тип оборудования</label>
        <input
          type="text"
          value={newType}
          onChange={(e) => setNewType(e.target.value)}
          placeholder="Например: Мышь"
        />
        <button onClick={handleAddType}>Добавить тип</button>
      </div>

      <div className={styles.formGroup}>
        <label>Выбрать тип оборудования</label>
        <select onChange={(e) => setSelectedTypeId(e.target.value)} value={selectedTypeId || ''}>
          <option value="">-- Выберите тип --</option>
          {equipmentTypes.map((type) => (
            <option key={type.id} value={type.id}>
              {type.name}
            </option>
          ))}
        </select>
      </div>

      {selectedTypeId && (
        <div className={styles.formGroup}>
          <label>Добавить модель</label>
          <input
            type="text"
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
        <button
          className={styles.buttonBack}
          onClick={() => router.push('/admin')}
        >
          Назад
        </button>
      </div>
    </div>
  );
}

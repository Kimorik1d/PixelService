import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import styles from '../styles/CreateRepair.module.css';
import { useUser } from '../context/UserContext';

export default function CreateRepair() {
  const router = useRouter();
  const { user } = useUser();

  const [description, setDescription] = useState('');
  const [pcNumber, setPcNumber] = useState('');
  const [equipmentTypes, setEquipmentTypes] = useState([]);
  const [selectedTypeId, setSelectedTypeId] = useState('');
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');

  useEffect(() => {
    fetchEquipmentTypes();
  }, []);

  useEffect(() => {
    if (selectedTypeId) {
      fetchModelsForType(selectedTypeId);
    } else {
      setModels([]);
      setSelectedModel('');
    }
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase.from('repairs').insert([
        {
          club_address: user?.club_address || '',
          description,
          status: 'Ожидает',
          pc_number: pcNumber,
          equipment_type: equipmentTypes.find((type) => type.id === parseInt(selectedTypeId))?.name,
          model: models.find((model) => model.id === parseInt(selectedModel))?.model_name,
        },
      ]);

      if (error) throw error;

      alert('Заявка успешно создана!');
      setDescription('');
      setPcNumber('');
      setSelectedTypeId('');
      setSelectedModel('');
    } catch (error) {
      console.error('Ошибка при создании заявки:', error.message);
      alert('Произошла ошибка при создании заявки.');
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Создание заявки</h1>
      <form onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
          <label className={styles.label}>Номер ПК:</label>
          <input
            type="text"
            value={pcNumber}
            onChange={(e) => setPcNumber(e.target.value)}
            className={styles.input}
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Тип оборудования:</label>
          <select
            className={styles.select}
            value={selectedTypeId}
            onChange={(e) => setSelectedTypeId(e.target.value)}
            required
          >
            <option value="">-- Выберите тип --</option>
            {equipmentTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Модель:</label>
          <select
            className={styles.select}
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            required
            disabled={!models.length}
          >
            <option value="">-- Выберите модель --</option>
            {models.map((model) => (
              <option key={model.id} value={model.id}>
                {model.model_name}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Описание:</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={styles.textarea}
            required
          />
        </div>

        <div className={styles.buttonGroup}>
          <button type="submit" className={styles.button}>
            Отправить заявку
          </button>
          <button
            type="button"
            onClick={() => router.push('/')}
            className={styles.secondaryButton}
          >
            На главную
          </button>
        </div>
      </form>
    </div>
  );
}

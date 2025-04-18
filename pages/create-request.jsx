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

  const [pcNumberError, setPcNumberError] = useState('');
  const [descriptionError, setDescriptionError] = useState('');

  useEffect(() => {
    if (user?.club_address) {
      fetchEquipmentTypes();
    }
  }, [user]);

  useEffect(() => {
    if (selectedTypeId && user?.club_address) {
      fetchModelsForType(selectedTypeId);
    } else {
      setModels([]);
      setSelectedModel('');
    }
  }, [selectedTypeId]);

  const fetchEquipmentTypes = async () => {
    const { data: typeLinks, error: linkError } = await supabase
      .from('club_equipment_types')
      .select('equipment_type_id')
      .eq('club_address', user.club_address);

    if (linkError) {
      console.error('Ошибка загрузки club_equipment_types:', linkError);
      return;
    }

    const typeIds = typeLinks.map(link => link.equipment_type_id);
    if (!typeIds.length) {
      setEquipmentTypes([]);
      return;
    }

    const { data: types, error: typesError } = await supabase
      .from('equipment_types')
      .select('*')
      .in('id', typeIds);

    if (typesError) {
      console.error('Ошибка загрузки типов оборудования:', typesError);
    } else {
      setEquipmentTypes(types);
    }
  };

  const fetchModelsForType = async (typeId) => {
    const { data: modelLinks, error: linkError } = await supabase
      .from('club_equipment_models')
      .select('equipment_model_id')
      .eq('club_address', user.club_address);

    if (linkError) {
      console.error('Ошибка загрузки club_equipment_models:', linkError);
      return;
    }

    const modelIds = modelLinks.map(link => link.equipment_model_id);
    if (!modelIds.length) {
      setModels([]);
      return;
    }

    const { data: modelsData, error: modelsError } = await supabase
      .from('equipment_models')
      .select('*')
      .eq('type_id', typeId)
      .in('id', modelIds);

    if (modelsError) {
      console.error('Ошибка загрузки моделей:', modelsError);
    } else {
      setModels(modelsData);
    }
  };

  const handlePcNumberChange = (value) => {
    setPcNumber(value);
    const valid = /^([0-9]{1,2}|PS5|PS4)$/i.test(value.trim());
    setPcNumberError(valid ? '' : 'Введите число от 0 до 99 или PS4 / PS5');
  };

  const handleDescriptionChange = (value) => {
    setDescription(value);
    if (value.length > 80) {
      setDescriptionError('Максимум 80 символов');
    } else {
      setDescriptionError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (pcNumberError || descriptionError) {
      alert('Проверьте правильность введённых данных.');
      return;
    }

    try {
      const timeZoneOffset = new Date().toLocaleString('en-US', { timeZone: 'Asia/Krasnoyarsk' });
      const localCreatedAt = new Date(timeZoneOffset).toISOString();

      const { data: insertedRepair, error: insertError } = await supabase
        .from('repairs')
        .insert([
          {
            club_address: user?.club_address || '',
            description,
            status: 'Неисправно',
            pc_number: pcNumber,
            equipment_type: equipmentTypes.find((type) => type.id === parseInt(selectedTypeId))?.name,
            model: models.find((model) => model.id === parseInt(selectedModel))?.model_name,
            created_at: localCreatedAt,
          },
        ])
        .select();

      if (insertError) throw insertError;

      await supabase.from('logs').insert([
        {
          user_login: user?.login || 'неизвестно',
          action: 'Создание заявки',
          details: `ID: ${insertedRepair?.[0]?.id}, ПК: ${pcNumber}, Описание: ${description}`,
        },
      ]);

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
            onChange={(e) => handlePcNumberChange(e.target.value)}
            className={styles.input}
            required
          />
          {pcNumberError && <div className={styles.error}>{pcNumberError}</div>}
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
            onChange={(e) => handleDescriptionChange(e.target.value)}
            className={styles.textarea}
            maxLength={90}
            required
          />
          <div className={styles.charCounter}>
            {description.length}/80
          </div>
          {descriptionError && <div className={styles.error}>{descriptionError}</div>}
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

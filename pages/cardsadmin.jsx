// pages/cardsadmin.jsx
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabaseClient';
import { withAdminGuard } from '@/lib/withAdminGuard';
import styles from '@/styles/Cards.module.css';

const CLUB_TABS = [
  'Мира',
  'Киренского',
  'Карамзина',
  'Лесников',
  'Мартынова',
  'Полигон',
  'Алексеева',
  '9 мая',
];

function CardsAdminPage({ user }) {
  const router = useRouter();
  const [cards, setCards] = useState([]);
  const [editingCardId, setEditingCardId] = useState(null);
  const [activeTab, setActiveTab] = useState('active');
  const [selectedClub, setSelectedClub] = useState(CLUB_TABS[0]);
  const [sortNewestFirst, setSortNewestFirst] = useState(true);

  useEffect(() => {
    fetchCards();
  }, [selectedClub, activeTab, sortNewestFirst]);

  const fetchCards = async () => {
    const { data, error } = await supabase
      .from('cards')
      .select('id, title, club_address, created_by, is_deleted, created_at, deleted_at, card_objects (id, name, comment)')
      .eq('club_address', selectedClub)
      .eq('is_deleted', activeTab === 'history')
      .order('created_at', { ascending: !sortNewestFirst });

    if (error) {
      console.error('Ошибка загрузки карточек:', error);
    } else {
      const mapped = data.map(card => ({
        ...card,
        objects: card.card_objects ?? [],
      }));
      setCards(mapped);
    }
  };

  const handleAddCard = () => {
    const newCard = {
      id: 'temp-' + Date.now(),
      title: 'Новая карточка',
      objects: [],
    };
    setCards(prev => [...prev, newCard]);
    setEditingCardId(newCard.id);
  };

  const handleUpdateCardTitle = (id, value) => {
    setCards(cards.map(card =>
      card.id === id ? { ...card, title: value } : card
    ));
  };

  const handleAddObject = (cardId) => {
    setCards(cards.map(card =>
      card.id === cardId
        ? {
            ...card,
            objects: [...card.objects, { id: Date.now(), name: '', comment: '' }]
          }
        : card
    ));
  };

  const handleUpdateObject = (cardId, objectId, field, value) => {
    setCards(cards.map(card =>
      card.id === cardId
        ? {
            ...card,
            objects: card.objects.map(obj =>
              obj.id === objectId ? { ...obj, [field]: value } : obj
            )
          }
        : card
    ));
  };

  const handleDeleteObject = (cardId, objectId) => {
    setCards(cards.map(card =>
      card.id === cardId
        ? {
            ...card,
            objects: card.objects.filter(obj => obj.id !== objectId)
          }
        : card
    ));
  };

  const handleDeleteCard = async (id) => {
    const deleted_at = new Date().toISOString();

    const { error } = await supabase
      .from('cards')
      .update({ is_deleted: true, deleted_at })
      .eq('id', id);

    if (error) {
      console.error('Ошибка при удалении карточки:', error.message);
      return;
    }

    setEditingCardId(null);
    fetchCards();
  };

  const saveCardToSupabase = async (card) => {
    const isNew = typeof card.id === 'string' && card.id.startsWith('temp');
    let cardId = card.id;

    try {
      if (isNew) {
        const payload = {
          title: card.title,
          club_address: selectedClub,
          created_by: user?.login || user?.email,
        };

        const { data, error } = await supabase
          .from('cards')
          .insert([payload])
          .select()
          .single();

        if (error) {
          console.error('Ошибка при создании карточки:', error.message);
          return;
        }

        cardId = data.id;
        setCards(prev =>
          prev.map(c => (c.id === card.id ? { ...c, id: cardId } : c))
        );
      } else {
        await supabase
          .from('cards')
          .update({ title: card.title })
          .eq('id', card.id);

        await supabase
          .from('card_objects')
          .delete()
          .eq('card_id', card.id);
      }

      if (card.objects.length > 0) {
        const inserts = card.objects.map(obj => ({
          card_id: cardId,
          name: obj.name,
          comment: obj.comment,
        }));

        const { error: insertError } = await supabase
          .from('card_objects')
          .insert(inserts);

        if (insertError) {
          console.error('Ошибка при вставке объектов:', insertError.message);
          return;
        }
      }

      await fetchCards();
      setEditingCardId(null);
    } catch (err) {
      console.error('Ошибка сохранения:', err);
    }
  };

  const formatDate = (dateString, shift = 0) => {
    const date = new Date(dateString);
    date.setHours(date.getHours() + shift);
    return date.toLocaleString('ru-RU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Карточки клубов (админ)</h1>
        <button className={styles.navButton} onClick={() => router.push('/admin')}>На главную</button>
      </div>

      <div className={styles.tabs}>
        {CLUB_TABS.map(club => (
          <button
            key={club}
            className={selectedClub === club ? styles.activeTab : styles.tab}
            onClick={() => setSelectedClub(club)}
          >
            {club}
          </button>
        ))}
      </div>

      <div className={styles.tabs}>
        <button
          className={activeTab === 'active' ? styles.activeTab : styles.tab}
          onClick={() => setActiveTab('active')}
        >Активные</button>
        <button
          className={activeTab === 'history' ? styles.activeTab : styles.tab}
          onClick={() => setActiveTab('history')}
        >История</button>
      </div>

      <div className={styles.sortControls}>
        <label>
          Сортировка:
          <select value={sortNewestFirst ? 'newest' : 'oldest'} onChange={(e) => setSortNewestFirst(e.target.value === 'newest')}>
            <option value="newest">Сначала новые</option>
            <option value="oldest">Сначала старые</option>
          </select>
        </label>
      </div>

      {activeTab === 'active' && (
        <button className={styles.addButton} onClick={handleAddCard}>
          + Добавить карточку
        </button>
      )}

      <div className={styles.cardsWrapper}>
        {cards.map((card) => {
          const isEditing = editingCardId === card.id && activeTab === 'active';
          return (
            <div
              key={card.id}
              className={styles.card}
              onClick={() => !isEditing && setEditingCardId(card.id)}
            >
              {isEditing ? (
                <>
                  <input
                    className={styles.input}
                    type="text"
                    placeholder="Название карточки"
                    value={card.title}
                    onChange={(e) => handleUpdateCardTitle(card.id, e.target.value)}
                  />
                  {card.objects.map((obj) => (
                    <div key={obj.id} className={styles.objectBlock}>
                      <input
                        className={styles.input}
                        type="text"
                        placeholder="Название объекта"
                        value={obj.name}
                        onChange={(e) =>
                          handleUpdateObject(card.id, obj.id, 'name', e.target.value)
                        }
                      />
                      <textarea
                        className={styles.textarea}
                        placeholder="Комментарий"
                        value={obj.comment}
                        onChange={(e) =>
                          handleUpdateObject(card.id, obj.id, 'comment', e.target.value)
                        }
                      />
                      <button
                        className={styles.deleteButton}
                        onClick={() => handleDeleteObject(card.id, obj.id)}
                      >Удалить объект</button>
                    </div>
                  ))}
                  <button
                    className={styles.addButton}
                    onClick={() => handleAddObject(card.id)}
                  >+ Добавить объект</button>
                  <button
                    className={styles.deleteButton}
                    onClick={() => handleDeleteCard(card.id)}
                  >Удалить карточку</button>
                  <button
                    className={styles.saveButton}
                    onClick={() => saveCardToSupabase(card)}
                  >Сохранить</button>
                </>
              ) : (
                <>
                  <h3>{card.title}</h3>

                  {activeTab === 'history' && (
                    <p className={styles.metaInfo}>
                      🗑️ Удалена: {card.deleted_at ? formatDate(card.deleted_at) : '—'}
                    </p>
                  )}

                  {card.created_at && (
                    <p className={styles.metaInfo}>
                      🕒 Создана: {formatDate(card.created_at, -7)}
                    </p>
                  )}

                  <ul>
                    {card.objects.map((obj) => (
                      <li key={obj.id}>
                        <strong>{obj.name}</strong>: {obj.comment}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default withAdminGuard(CardsAdminPage);

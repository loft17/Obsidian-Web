import { useState, type KeyboardEvent } from 'react';
import { isDateString, type FrontmatterData } from '../frontmatter';
import { useT } from '../i18n';
import {
  IconTag,
  IconCalendar,
  IconText,
  IconLink,
  IconAliases,
  IconHash,
  IconCheckSquare,
  IconClose,
  IconPlus,
} from './Icons';

interface Props {
  data: FrontmatterData;
  editable?: boolean;
  onChange?: (data: FrontmatterData) => void;
  onTagClick?: (tag: string) => void;
}

type Kind = 'tags' | 'list' | 'date' | 'number' | 'checkbox' | 'text';

function kindOf(key: string, value: unknown): Kind {
  if (key === 'tags') return 'tags';
  if (key === 'aliases' || Array.isArray(value)) return 'list';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'checkbox';
  if (isDateString(value)) return 'date';
  return 'text';
}

const toList = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map(String);
  if (value === null || value === undefined || value === '') return [];
  return [String(value)];
};

const toText = (value: unknown): string => (value === null || value === undefined ? '' : String(value));

const ICONS: Record<Kind, typeof IconText> = {
  tags: IconTag,
  list: IconAliases,
  date: IconCalendar,
  number: IconHash,
  checkbox: IconCheckSquare,
  text: IconText,
};

function ChipList({
  items,
  pill,
  editable,
  onChange,
  onItemClick,
}: {
  items: string[];
  pill: boolean;
  editable: boolean;
  onChange: (items: string[]) => void;
  onItemClick?: (item: string) => void;
}) {
  const [draft, setDraft] = useState('');
  const t = useT();

  const commit = () => {
    const text = (pill ? draft.replace(/^#/, '') : draft).trim();
    setDraft('');
    if (text && !items.includes(text)) onChange([...items, text]);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || (pill && e.key === ',')) {
      e.preventDefault();
      commit();
    } else if (e.key === 'Backspace' && draft === '' && items.length > 0) {
      onChange(items.slice(0, -1));
    }
  };

  return (
    <div className="chip-list">
      {items.map((item, i) => (
        <span
          key={`${item}-${i}`}
          className={`${pill ? 'chip chip-pill' : 'chip'}${onItemClick ? ' clickable' : ''}`}
          title={onItemClick ? t('props.searchTag', { tag: item }) : undefined}
          onClick={onItemClick && (() => onItemClick(item))}
        >
          {item}
          {editable && (
            <button
              type="button"
              className="chip-remove"
              title={t('props.removeValue')}
              onClick={() => onChange(items.filter((_, j) => j !== i))}
            >
              <IconClose size={14} />
            </button>
          )}
        </span>
      ))}
      {editable && (
        <input
          className="chip-input"
          value={draft}
          size={Math.max(draft.length, 1)}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={commit}
        />
      )}
    </div>
  );
}

function DateText({ value }: { value: string }) {
  const [y, m, d] = value.split('-');
  return (
    <span className="date-value">
      <IconCalendar size={14} />
      <span>
        {d}
        <span className="date-sep">/</span>
        {m}
        <span className="date-sep">/</span>
        {y}
      </span>
      <IconLink size={14} className="date-link" />
    </span>
  );
}

export default function Properties({ data, editable = false, onChange, onTagClick }: Props) {
  const [adding, setAdding] = useState(false);
  const [newKey, setNewKey] = useState('');
  const t = useT();

  const entries = Object.entries(data).filter(
    ([, value]) => editable || (value !== null && value !== undefined && value !== '' && !(Array.isArray(value) && value.length === 0))
  );

  if (!editable && entries.length === 0) return null;

  const setValue = (key: string, value: unknown) => onChange?.({ ...data, [key]: value });

  const removeKey = (key: string) => {
    const next = { ...data };
    delete next[key];
    onChange?.(next);
  };

  const addProperty = () => {
    const key = newKey.trim();
    setAdding(false);
    setNewKey('');
    if (!key || key in data) return;
    onChange?.({ ...data, [key]: key === 'tags' || key === 'aliases' ? [] : '' });
  };

  return (
    <div className="properties">
      {entries.length > 0 && <div className="properties-heading">{t('props.title')}</div>}
      {entries.map(([key, value]) => {
        const kind = kindOf(key, value);
        const Icon = ICONS[kind];
        return (
          <div key={key} className={editable ? 'property-row editable' : 'property-row'}>
            <span className="property-key">
              <Icon size={16} />
              <span className="property-label">{key}</span>
            </span>
            <div className="property-value">
              {kind === 'tags' || kind === 'list' ? (
                <ChipList
                  items={toList(value)}
                  pill={kind === 'tags'}
                  editable={editable}
                  onChange={(items) => setValue(key, items)}
                  onItemClick={kind === 'tags' && !editable ? onTagClick : undefined}
                />
              ) : kind === 'checkbox' ? (
                <input
                  type="checkbox"
                  checked={value === true}
                  disabled={!editable}
                  onChange={(e) => setValue(key, e.target.checked)}
                />
              ) : editable ? (
                <input
                  className="property-input"
                  type={kind === 'date' ? 'date' : kind === 'number' ? 'number' : 'text'}
                  value={toText(value)}
                  onChange={(e) => {
                    const text = e.target.value;
                    setValue(key, kind === 'number' && text !== '' ? Number(text) : text);
                  }}
                />
              ) : kind === 'date' ? (
                <DateText value={value as string} />
              ) : (
                <span>{toText(value)}</span>
              )}
            </div>
            {editable && (
              <button type="button" className="property-remove" title={t('props.remove')} onClick={() => removeKey(key)}>
                <IconClose size={14} />
              </button>
            )}
          </div>
        );
      })}

      {editable &&
        (adding ? (
          <input
            className="property-new-key"
            autoFocus
            placeholder={t('props.name')}
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addProperty();
              if (e.key === 'Escape') {
                setAdding(false);
                setNewKey('');
              }
            }}
            onBlur={addProperty}
          />
        ) : (
          <button type="button" className="property-add" onClick={() => setAdding(true)}>
            <IconPlus size={16} />
            {t('props.add')}
          </button>
        ))}
    </div>
  );
}

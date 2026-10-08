import { useT } from '../i18n';

interface Props {
  content: string;
}

export default function StatusBar({ content }: Props) {
  const wordCount = content.trim().split(/\s+/).filter((w) => w.length > 0).length;
  const charCount = content.length;
  const t = useT();

  return (
    <div className="status-bar">
      <div className="status-bar-item">{t(wordCount === 1 ? 'status.word' : 'status.words', { n: wordCount })}</div>
      <div className="status-bar-item">{t(charCount === 1 ? 'status.char' : 'status.chars', { n: charCount })}</div>
    </div>
  );
}

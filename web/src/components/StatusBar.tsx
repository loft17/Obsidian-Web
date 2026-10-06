interface Props {
  content: string;
}

export default function StatusBar({ content }: Props) {
  const wordCount = content.trim().split(/\s+/).filter((w) => w.length > 0).length;
  const charCount = content.length;

  return (
    <div className="status-bar">
      <div className="status-bar-item">{wordCount} palabras</div>
      <div className="status-bar-item">{charCount} caracteres</div>
    </div>
  );
}

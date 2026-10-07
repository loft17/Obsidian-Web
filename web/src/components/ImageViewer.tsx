import { useState, useEffect } from 'react';
import { rawFileUrl } from '../attachments';

// Visor de imágenes del vault: ajustada a la ventana; clic para alternar con el tamaño real
export default function ImageViewer({ filePath }: { filePath: string }) {
  const [actualSize, setActualSize] = useState(false);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    setActualSize(false);
    setSize(null);
    setError(false);
  }, [filePath]);

  const url = rawFileUrl(filePath);

  if (error) {
    return <div className="image-viewer-message">No se pudo cargar la imagen</div>;
  }

  return (
    <div className={`image-viewer ${actualSize ? 'actual-size' : ''}`}>
      <img
        src={url}
        alt={filePath.split('/').pop()}
        title={actualSize ? 'Clic para ajustar a la ventana' : 'Clic para ver a tamaño real'}
        onClick={() => setActualSize(!actualSize)}
        onLoad={(e) => setSize({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
        onError={() => setError(true)}
      />
      {size && (
        <div className="image-viewer-info">
          {size.w} × {size.h} px ·{' '}
          <a href={url} target="_blank" rel="noopener noreferrer">
            Abrir original
          </a>
        </div>
      )}
    </div>
  );
}

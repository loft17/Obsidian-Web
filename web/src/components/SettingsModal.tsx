import { useEffect, useState, type CSSProperties } from 'react';
import { useStore, type EditorMode, type Theme, DEFAULT_FONT_SIZE, MIN_FONT_SIZE, MAX_FONT_SIZE } from '../store';
import { filesApi, settingsApi, syncApi, type ServerLimits, type SyncConfig, type SyncConfigUpdate, type SyncProvider } from '../api';
import { IconClose, IconEdit, IconEye, IconFolderNew, IconList, IconLock, IconReset, IconSearch, IconSync, IconUserCircle } from './Icons';

interface Props {
  onClose: () => void;
}

const SECTIONS = [
  { id: 'about', label: 'Acerca de', Icon: IconUserCircle },
  { id: 'appearance', label: 'Apariencia', Icon: IconEye },
  { id: 'editor', label: 'Editor', Icon: IconEdit },
  { id: 'files', label: 'Archivos', Icon: IconFolderNew },
  { id: 'sync', label: 'Sincronización', Icon: IconSync },
  { id: 'security', label: 'Seguridad', Icon: IconLock },
  { id: 'shortcuts', label: 'Atajos', Icon: IconList },
];

// Los cambios se guardan automáticamente (el store los persiste en localStorage)
function AppearanceSection() {
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
  const fontSize = useStore((s) => s.fontSize);
  const setFontSize = useStore((s) => s.setFontSize);
  const showTabHeader = useStore((s) => s.showTabHeader);
  const setShowTabHeader = useStore((s) => s.setShowTabHeader);
  const showRibbon = useStore((s) => s.showRibbon);
  const setShowRibbon = useStore((s) => s.setShowRibbon);
  const quickFontSize = useStore((s) => s.quickFontSize);
  const setQuickFontSize = useStore((s) => s.setQuickFontSize);
  const fontPercent = ((fontSize - MIN_FONT_SIZE) / (MAX_FONT_SIZE - MIN_FONT_SIZE)) * 100;
  return (
    <div className="settings-group">
      <div className="setting-item">
        <div className="setting-info">
          <div className="setting-name">Tema</div>
          <div className="setting-desc">Esquema de colores de la aplicación</div>
        </div>
        <select value={theme} onChange={(e) => setTheme(e.target.value as Theme)}>
          <option value="dark">Oscuro</option>
          <option value="light">Claro</option>
          <option value="system">Según el sistema</option>
        </select>
      </div>
      <div className="setting-item">
        <div className="setting-info">
          <div className="setting-name">Tamaño de fuente</div>
          <div className="setting-desc">Tamaño de fuente en píxeles que afecta al editor y la vista previa.</div>
        </div>
        <div className="setting-slider">
          <button
            className="icon-btn"
            title="Restablecer valor predeterminado"
            disabled={fontSize === DEFAULT_FONT_SIZE}
            onClick={() => setFontSize(DEFAULT_FONT_SIZE)}
          >
            <IconReset size={16} />
          </button>
          <span className="setting-slider-value">{fontSize}</span>
          <input
            type="range"
            min={MIN_FONT_SIZE}
            max={MAX_FONT_SIZE}
            step={1}
            value={fontSize}
            style={{ '--slider-fill': `${fontPercent}%` } as CSSProperties}
            onChange={(e) => setFontSize(Number(e.target.value))}
          />
        </div>
      </div>
      <div className="setting-item">
        <div className="setting-info">
          <div className="setting-name">Ajuste rápido del tamaño de fuente</div>
          <div className="setting-desc">
            Ajuste el tamaño de la fuente usando Ctrl + Rueda del ratón, o usando el gesto de pellizcar y acercar del
            trackpad.
          </div>
        </div>
        <label className="setting-toggle">
          <input
            type="checkbox"
            checked={quickFontSize}
            onChange={(e) => setQuickFontSize(e.target.checked)}
          />
          <span />
        </label>
      </div>
      <div className="setting-item">
        <div className="setting-info">
          <div className="setting-name">Mostrar la barra de título de pestaña</div>
          <div className="setting-desc">Mostrar el encabezado en la parte superior de todas las pestañas.</div>
        </div>
        <label className="setting-toggle">
          <input type="checkbox" checked={showTabHeader} onChange={(e) => setShowTabHeader(e.target.checked)} />
          <span />
        </label>
      </div>
      <div className="setting-item">
        <div className="setting-info">
          <div className="setting-name">Mostrar menú de cinta</div>
          <div className="setting-desc">
            Muestra una barra de herramientas vertical en el costado de la ventana. Si se oculta, sus botones
            pasan al pie de la barra lateral.
          </div>
        </div>
        <label className="setting-toggle">
          <input type="checkbox" checked={showRibbon} onChange={(e) => setShowRibbon(e.target.checked)} />
          <span />
        </label>
      </div>
    </div>
  );
}

function EditorSection() {
  const defaultEditMode = useStore((s) => s.defaultEditMode);
  const setDefaultEditMode = useStore((s) => s.setDefaultEditMode);
  const editorMode = useStore((s) => s.editorMode);
  const setEditorMode = useStore((s) => s.setEditorMode);
  const showInlineTitle = useStore((s) => s.showInlineTitle);
  const setShowInlineTitle = useStore((s) => s.setShowInlineTitle);
  const showLineNumbers = useStore((s) => s.showLineNumbers);
  const setShowLineNumbers = useStore((s) => s.setShowLineNumbers);
  const readableLineLength = useStore((s) => s.readableLineLength);
  const setReadableLineLength = useStore((s) => s.setReadableLineLength);
  return (
    <>
    <div className="settings-group">
      <div className="setting-item">
        <div className="setting-info">
          <div className="setting-name">Modo por defecto de las notas</div>
          <div className="setting-desc">Cómo se abren las notas al seleccionarlas</div>
        </div>
        <select
          value={defaultEditMode ? 'edit' : 'view'}
          onChange={(e) => setDefaultEditMode(e.target.value === 'edit')}
        >
          <option value="view">Modo visor</option>
          <option value="edit">Modo edición</option>
        </select>
      </div>
      <div className="setting-item">
        <div className="setting-info">
          <div className="setting-name">Modo de edición predeterminado</div>
          <div className="setting-desc">
            Vista previa: oculta la sintaxis de markdown salvo en la línea que editas. Fuente: muestra el markdown tal
            cual.
          </div>
        </div>
        <select value={editorMode} onChange={(e) => setEditorMode(e.target.value as EditorMode)}>
          <option value="preview">Modo vista previa</option>
          <option value="source">Modo fuente</option>
        </select>
      </div>
    </div>
    <h3 className="settings-heading">Pantalla</h3>
    <div className="settings-group">
      <div className="setting-item">
        <div className="setting-info">
          <div className="setting-name">Título en línea</div>
          <div className="setting-desc">
            Mostrar el nombre de archivo como un título editable en línea con el contenido del archivo.
          </div>
        </div>
        <label className="setting-toggle">
          <input type="checkbox" checked={showInlineTitle} onChange={(e) => setShowInlineTitle(e.target.checked)} />
          <span />
        </label>
      </div>
      <div className="setting-item">
        <div className="setting-info">
          <div className="setting-name">Longitud de línea legible</div>
          <div className="setting-desc">
            Limita la longitud de línea máxima. Muestra menos contenido en pantalla, pero los párrafos largos son más
            legibles.
          </div>
        </div>
        <label className="setting-toggle">
          <input
            type="checkbox"
            checked={readableLineLength}
            onChange={(e) => setReadableLineLength(e.target.checked)}
          />
          <span />
        </label>
      </div>
      <div className="setting-item">
        <div className="setting-info">
          <div className="setting-name">Números de línea</div>
          <div className="setting-desc">Muestra los números de línea.</div>
        </div>
        <label className="setting-toggle">
          <input type="checkbox" checked={showLineNumbers} onChange={(e) => setShowLineNumbers(e.target.checked)} />
          <span />
        </label>
      </div>
    </div>
    </>
  );
}

type AttachmentMode = 'root' | 'same' | 'sub' | 'folder';

// Traduce `attachmentFolderPath` de Obsidian a la opción del desplegable y su carpeta
const parseAttachmentSetting = (value: string): { mode: AttachmentMode; folder: string } => {
  if (value === '' || value === '/') return { mode: 'root', folder: '' };
  if (value === '.' || value === './') return { mode: 'same', folder: '' };
  if (value.startsWith('./')) return { mode: 'sub', folder: value.slice(2) };
  return { mode: 'folder', folder: value };
};

const buildAttachmentSetting = (mode: AttachmentMode, folder: string) => {
  const name = folder.trim().replace(/^\/+|\/+$/g, '') || 'attachments';
  if (mode === 'root') return '/';
  if (mode === 'same') return './';
  return mode === 'sub' ? `./${name}` : name;
};

// Se guarda en .obsidian/app.json del vault, compartido con Obsidian de escritorio
function AttachmentsSetting() {
  const [loaded, setLoaded] = useState(false);
  const [mode, setMode] = useState<AttachmentMode>('root');
  const [folder, setFolder] = useState('');
  const [savedFolder, setSavedFolder] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    settingsApi
      .getAttachments()
      .then((r) => {
        const parsed = parseAttachmentSetting(r.attachmentFolderPath);
        setMode(parsed.mode);
        setFolder(parsed.folder);
        setSavedFolder(parsed.folder);
        setLoaded(true);
      })
      .catch((err) => setError(err.message));
  }, []);

  const save = async (newMode: AttachmentMode, newFolder: string) => {
    setError('');
    try {
      const r = await settingsApi.setAttachments(buildAttachmentSetting(newMode, newFolder));
      const parsed = parseAttachmentSetting(r.attachmentFolderPath);
      setMode(parsed.mode);
      setFolder(parsed.folder);
      setSavedFolder(parsed.folder);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const saveFolder = () => folder.trim() !== savedFolder && save(mode, folder);

  return (
    <>
      <div className="setting-item">
        <div className="setting-info">
          <div className="setting-name">Ubicación predeterminada para los archivos adjuntos nuevos</div>
          <div className="setting-desc">Dónde se ubican los archivos adjuntos recién agregados.</div>
          {error && <div className="setting-desc" style={{ color: 'var(--text-error, #e5484d)' }}>{error}</div>}
        </div>
        <select
          value={mode}
          disabled={!loaded}
          onChange={(e) => save(e.target.value as AttachmentMode, folder)}
        >
          <option value="root">Carpeta de la bóveda</option>
          <option value="same">Misma carpeta donde está el archivo</option>
          <option value="sub">En la subcarpeta de la carpeta actual</option>
          <option value="folder">En la carpeta especificada abajo</option>
        </select>
      </div>
      {(mode === 'sub' || mode === 'folder') && (
        <div className="setting-item">
          <div className="setting-info">
            <div className="setting-name">
              {mode === 'sub' ? 'Nombre de la subcarpeta' : 'Ruta de la carpeta de archivos adjuntos'}
            </div>
            <div className="setting-desc">
              {mode === 'sub'
                ? `Si su archivo está en "bóveda/carpeta", y su nombre de la subcarpeta establecida en "${folder || 'adjuntos'}", los archivos adjuntos se guardarán en "bóveda/carpeta/${folder || 'adjuntos'}".`
                : 'Ruta relativa a la raíz de la bóveda donde se guardarán todos los adjuntos.'}
            </div>
          </div>
          <input
            className="setting-input"
            type="text"
            placeholder="attachments"
            value={folder}
            onChange={(e) => setFolder(e.target.value)}
            onBlur={saveFolder}
            onKeyDown={(e) => e.key === 'Enter' && saveFolder()}
          />
        </div>
      )}
    </>
  );
}

function FilesSection() {
  const hiddenFolders = useStore((s) => s.hiddenFolders);
  const setHiddenFolders = useStore((s) => s.setHiddenFolders);
  const [vaultPath, setVaultPath] = useState('');
  const [savedPath, setSavedPath] = useState('');
  const [vaultPassword, setVaultPassword] = useState('');
  const [vaultError, setVaultError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    settingsApi
      .getVault()
      .then((r) => {
        setVaultPath(r.vaultPath);
        setSavedPath(r.vaultPath);
      })
      .catch((err) => setVaultError(err.message));
  }, []);

  const saveVault = async () => {
    setVaultError('');
    setSaving(true);
    try {
      await settingsApi.setVault(vaultPath.trim(), vaultPassword);
      // Recargar para descartar pestañas y árbol de la bóveda anterior
      window.location.reload();
    } catch (err) {
      setVaultError((err as Error).message);
      setSaving(false);
    }
  };

  return (
    <div className="settings-group">
      <div className="setting-item">
        <div className="setting-info">
          <div className="setting-name">Ruta de la bóveda</div>
          <div className="setting-desc">
            Ruta absoluta en el servidor. Se creará si no existe. Para cambiarla hace falta la contraseña;
            al guardar se recargará la aplicación.
          </div>
          {vaultError && <div className="setting-desc" style={{ color: 'var(--text-error, #e5484d)' }}>{vaultError}</div>}
        </div>
      </div>
      <div className="setting-item">
        <input
          className="setting-input"
          type="text"
          value={vaultPath}
          onChange={(e) => setVaultPath(e.target.value)}
          disabled={saving}
        />
      </div>
      {vaultPath.trim() !== savedPath && (
        <div className="setting-item">
          <input
            className="setting-input"
            type="password"
            placeholder="Contraseña actual"
            autoComplete="current-password"
            value={vaultPassword}
            onChange={(e) => setVaultPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && vaultPath.trim() && vaultPassword && saveVault()}
            disabled={saving}
          />
          <button onClick={saveVault} disabled={saving || !vaultPath.trim() || !vaultPassword}>
            Guardar
          </button>
        </div>
      )}
      <AttachmentsSetting />
      <div className="setting-item">
        <div className="setting-info">
          <div className="setting-name">Ocultar carpetas</div>
          <div className="setting-desc">
            Un patrón por línea, p. ej. <code>_recursos</code> o <code>_*</code>. Usa * como comodín.
            Las carpetas que coincidan (y su contenido) no se mostrarán en el árbol.
          </div>
        </div>
      </div>
      <textarea
        className="setting-textarea"
        rows={6}
        placeholder={'_recursos\n_*'}
        value={hiddenFolders}
        onChange={(e) => setHiddenFolders(e.target.value)}
      />
    </div>
  );
}

const INTERVAL_OPTIONS = [
  { value: 0, label: 'Solo manual' },
  { value: 5, label: 'Cada 5 minutos' },
  { value: 15, label: 'Cada 15 minutos' },
  { value: 30, label: 'Cada 30 minutos' },
  { value: 60, label: 'Cada hora' },
  { value: 180, label: 'Cada 3 horas' },
  { value: 1440, label: 'Una vez al día' },
];

const errorStyle = { color: 'var(--text-error, #e5484d)' };
const fieldStyle = { flex: '0 1 280px', minWidth: 0 };

const formatDate = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : 'nunca');

// La configuración y el token se guardan en el servidor (data/sync.json);
// el token nunca vuelve al navegador, solo si está guardado
function SyncSection() {
  const setTree = useStore((s) => s.setTree);
  const [config, setConfig] = useState<SyncConfig | null>(null);
  const [provider, setProvider] = useState<SyncProvider>('none');
  const [interval, setIntervalValue] = useState(0);
  const [repo, setRepo] = useState('');
  const [branch, setBranch] = useState('main');
  const [githubToken, setGithubToken] = useState('');
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const applyConfig = (c: SyncConfig, p: SyncProvider = c.provider) => {
    setConfig(c);
    setProvider(p);
    setIntervalValue(c.interval);
    setRepo(c.github.repo);
    setBranch(c.github.branch);
    setGithubToken('');
  };

  useEffect(() => {
    syncApi
      .get()
      .then((c) => applyConfig(c))
      .catch((err) => setMessage({ error: true, text: err.message }));
  }, []);

  // Si hay una sincronización automática en marcha, se sigue su estado
  const running = Boolean(config?.status.running);
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      syncApi.get().then((c) => setConfig((prev) => (prev ? { ...prev, status: c.status } : c))).catch(() => {});
    }, 3000);
    return () => window.clearInterval(id);
  }, [running]);

  const changeProvider = (p: SyncProvider) => {
    setMessage(null);
    if (config) applyConfig(config, p);
    else setProvider(p);
  };

  const dirty =
    !!config &&
    (provider !== config.provider ||
      interval !== config.interval ||
      (provider === 'github' &&
        (repo.trim() !== config.github.repo || branch.trim() !== config.github.branch || githubToken.trim() !== '')));

  const save = async () => {
    setMessage(null);
    setBusy(true);
    const changes: SyncConfigUpdate = { provider, interval };
    if (provider === 'github') changes.github = { repo: repo.trim(), branch: branch.trim(), token: githubToken.trim() };
    try {
      applyConfig(await syncApi.configure(changes));
      setMessage({ error: false, text: 'Guardado.' });
    } catch (err) {
      setMessage({ error: true, text: (err as Error).message });
    }
    setBusy(false);
  };

  const forgetToken = async () => {
    setMessage(null);
    try {
      applyConfig(await syncApi.configure({ github: { token: null } }), provider);
    } catch (err) {
      setMessage({ error: true, text: (err as Error).message });
    }
  };

  const syncNow = async () => {
    setMessage(null);
    setBusy(true);
    setConfig((prev) => (prev ? { ...prev, status: { ...prev.status, running: true } } : prev));
    try {
      const c = await syncApi.run();
      setConfig(c);
      // Puede haber traído notas nuevas o cambiadas
      setTree(await filesApi.getTree());
    } catch (err) {
      setMessage({ error: true, text: (err as Error).message });
    }
    setBusy(false);
  };

  if (!config) {
    return message ? <div className="setting-desc" style={errorStyle}>{message.text}</div> : null;
  }

  const hasToken = provider === 'github' && config.github.hasToken;
  const status = config.status;

  return (
    <>
      <div className="settings-group">
        <div className="setting-item">
          <div className="setting-info">
            <div className="setting-name">Servicio</div>
            <div className="setting-desc">
              Mantiene la bóveda del servidor sincronizada con un repositorio de GitHub (y, a través de él, con
              Obsidian de escritorio usando el plugin Obsidian Git).
            </div>
          </div>
          <select value={provider} onChange={(e) => changeProvider(e.target.value as SyncProvider)} disabled={busy}>
            <option value="none">Desactivada</option>
            <option value="github">GitHub</option>
          </select>
        </div>
        {provider !== 'none' && (
          <div className="setting-item">
            <div className="setting-info">
              <div className="setting-name">Sincronización automática</div>
              <div className="setting-desc">Frecuencia con la que el servidor sincroniza solo.</div>
            </div>
            <select value={interval} onChange={(e) => setIntervalValue(Number(e.target.value))} disabled={busy}>
              {INTERVAL_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {provider === 'github' && (
        <>
          <h3 className="settings-heading">GitHub</h3>
          <div className="settings-group">
            <div className="setting-item">
              <div className="setting-info">
                <div className="setting-name">Repositorio</div>
                <div className="setting-desc">
                  <code>usuario/repositorio</code> o su URL https. Mejor privado: se suben todas las notas.
                </div>
              </div>
              <input
                className="setting-input"
                style={fieldStyle}
                type="text"
                placeholder="usuario/mi-vault"
                value={repo}
                onChange={(e) => setRepo(e.target.value)}
                disabled={busy}
              />
            </div>
            <div className="setting-item">
              <div className="setting-info">
                <div className="setting-name">Rama</div>
              </div>
              <input
                className="setting-input"
                style={fieldStyle}
                type="text"
                placeholder="main"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                disabled={busy}
              />
            </div>
            <div className="setting-item">
              <div className="setting-info">
                <div className="setting-name">Token de acceso personal</div>
                <div className="setting-desc">
                  Créalo en GitHub → Settings → Developer settings → <em>Fine-grained tokens</em>, solo para este
                  repositorio y con permiso <em>Contents: Read and write</em>.
                  {hasToken && ' Hay un token guardado; escribe otro solo para cambiarlo.'}
                </div>
              </div>
              <input
                className="setting-input"
                style={fieldStyle}
                type="password"
                autoComplete="off"
                placeholder={hasToken ? '•••••••• (guardado)' : 'github_pat_…'}
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
                disabled={busy}
              />
            </div>
          </div>
          <div className="setting-desc" style={{ marginTop: 8 }}>
            Cada sincronización hace commit de los cambios, integra los del repositorio (si una nota cambió en los dos
            lados, se queda la versión del servidor) y sube el resultado. La papelera <code>.trash/</code> no se sube.
          </div>
        </>
      )}


      <div className="setting-item" style={{ borderBottom: 'none' }}>
        <div className="setting-info">
          {message && (
            <div className="setting-desc" style={message.error ? errorStyle : undefined}>
              {message.text}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {hasToken && (
            <button onClick={forgetToken} disabled={busy}>
              Olvidar token
            </button>
          )}
          <button onClick={save} disabled={busy || !dirty}>
            Guardar
          </button>
        </div>
      </div>

      {config.provider !== 'none' && (
        <>
          <h3 className="settings-heading">Estado</h3>
          <div className="settings-group">
            <div className="setting-item">
              <div className="setting-info">
                <div className="setting-name">
                  {status.running ? 'Sincronizando…' : `Última sincronización: ${formatDate(status.lastSync)}`}
                </div>
                {!status.running && status.lastError && (
                  <div className="setting-desc" style={errorStyle}>
                    Error ({formatDate(status.lastAttempt)}): {status.lastError}
                  </div>
                )}
                {!status.running && !status.lastError && status.lastMessage && (
                  <div className="setting-desc">{status.lastMessage}</div>
                )}
              </div>
              <button onClick={syncNow} disabled={busy || status.running || dirty} title={dirty ? 'Guarda antes los cambios' : undefined}>
                Sincronizar ahora
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

// Límites del servidor (variables de entorno); null mientras se cargan o si falla la petición
function useServerLimits() {
  const [limits, setLimits] = useState<ServerLimits | null>(null);
  useEffect(() => {
    settingsApi.getLimits().then(setLimits).catch(() => {});
  }, []);
  return limits;
}

function SecuritySection() {
  const limits = useServerLimits();
  const MIN_PASSWORD_LENGTH = limits?.minPasswordLength ?? 12;
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState(false);

  const mismatch = confirm !== '' && next !== confirm;
  const canSave = !busy && current && next.length >= MIN_PASSWORD_LENGTH && next === confirm;

  const changePassword = async () => {
    setMessage(null);
    setBusy(true);
    try {
      await settingsApi.changePassword(current, next);
      setCurrent('');
      setNext('');
      setConfirm('');
      setMessage({ error: false, text: 'Contraseña cambiada. Se han cerrado las demás sesiones.' });
    } catch (err) {
      setMessage({ error: true, text: (err as Error).message });
    }
    setBusy(false);
  };

  const revokeSessions = async () => {
    setBusy(true);
    try {
      await settingsApi.revokeSessions();
      window.location.reload();
    } catch (err) {
      setMessage({ error: true, text: (err as Error).message });
      setBusy(false);
    }
  };

  return (
    <>
      <div className="settings-group">
        <div className="setting-item">
          <div className="setting-info">
            <div className="setting-name">Cambiar la contraseña</div>
            <div className="setting-desc">
              Mínimo {MIN_PASSWORD_LENGTH} caracteres. Se cerrarán las sesiones abiertas en otros dispositivos.
            </div>
            {message && (
              <div className="setting-desc" style={message.error ? { color: 'var(--text-error, #e5484d)' } : undefined}>
                {message.text}
              </div>
            )}
          </div>
        </div>
        <div className="setting-item">
          <input
            className="setting-input"
            type="password"
            placeholder="Contraseña actual"
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            disabled={busy}
          />
        </div>
        <div className="setting-item">
          <input
            className="setting-input"
            type="password"
            placeholder="Contraseña nueva"
            autoComplete="new-password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            disabled={busy}
          />
        </div>
        <div className="setting-item">
          <input
            className="setting-input"
            type="password"
            placeholder={mismatch ? 'Las contraseñas no coinciden' : 'Repite la contraseña nueva'}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && canSave && changePassword()}
            disabled={busy}
            style={mismatch ? { borderColor: 'var(--text-error, #e5484d)' } : undefined}
          />
          <button onClick={changePassword} disabled={!canSave}>
            Cambiar
          </button>
        </div>
      </div>
      <div className="settings-group">
        <div className="setting-item">
          <div className="setting-info">
            <div className="setting-name">Cerrar todas las sesiones</div>
            <div className="setting-desc">
              Cierra la sesión en todos los dispositivos, también en este. Las sesiones caducan solas a los{' '}
              {limits?.sessionMaxDays ?? 30} días o tras {limits?.sessionIdleDays ?? 7} días sin usarse.
            </div>
          </div>
          {confirmRevoke ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setConfirmRevoke(false)} disabled={busy}>
                Cancelar
              </button>
              <button onClick={revokeSessions} disabled={busy}>
                Confirmar
              </button>
            </div>
          ) : (
            <button onClick={() => setConfirmRevoke(true)}>Cerrar todas</button>
          )}
        </div>
      </div>
    </>
  );
}

const SHORTCUT_GROUPS = [
  {
    title: 'Generales',
    items: [
      { keys: ['Ctrl', 'P'], desc: 'Abrir nota (buscador rápido)' },
      { keys: ['Ctrl', 'S'], desc: 'Guardar la nota ahora' },
      { keys: ['Ctrl', 'E'], desc: 'Alternar entre edición y lectura' },
      { keys: ['Ctrl', 'B'], desc: 'Mostrar u ocultar la barra lateral' },
      { keys: ['Esc'], desc: 'Cerrar menús, diálogos y la búsqueda' },
    ],
  },
  {
    title: 'Buscar en la nota',
    items: [
      { keys: ['Ctrl', 'F'], desc: 'Abrir la búsqueda en la nota' },
      { keys: ['Enter'], desc: 'Siguiente resultado (Mayús para el anterior)' },
      { keys: ['F3'], desc: 'Siguiente resultado' },
      { keys: ['Mayús', 'F3'], desc: 'Resultado anterior' },
    ],
  },
  {
    title: 'Abrir nota',
    items: [
      { keys: ['↑', '↓'], desc: 'Moverse por los resultados' },
      { keys: ['Enter'], desc: 'Abrir la nota seleccionada' },
    ],
  },
  {
    title: 'Propiedades',
    items: [
      { keys: ['Enter'], desc: 'Añadir el valor o la propiedad' },
      { keys: [','], desc: 'Añadir el valor en listas y etiquetas' },
      { keys: ['Retroceso'], desc: 'Con el campo vacío, borrar el último valor' },
      { keys: ['Esc'], desc: 'Cancelar una propiedad nueva' },
    ],
  },
];

function ShortcutsSection() {
  return (
    <>
      <div className="setting-desc" style={{ marginBottom: 12 }}>
        En Mac, usa Cmd en lugar de Ctrl.
      </div>
      {SHORTCUT_GROUPS.map((group) => (
        <div className="settings-group" key={group.title}>
          <div className="settings-nav-title">{group.title}</div>
          {group.items.map((item) => (
            <div className="setting-item" key={item.desc}>
              <div className="setting-info">
                <div className="setting-name">{item.desc}</div>
              </div>
              <div className="shortcut-keys">
                {item.keys.map((k, i) => (
                  <span key={i}>
                    {i > 0 && ' + '}
                    <kbd>{k}</kbd>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}
    </>
  );
}

function AboutSection() {
  const limits = useServerLimits();
  const rows: [string, string, string][] = limits
    ? [
        ['Tamaño máximo de una nota', `${limits.maxNoteMB} MB`, 'MAX_NOTE_MB'],
        ['Tamaño máximo de un adjunto', `${limits.maxUploadMB} MB`, 'MAX_UPLOAD_MB'],
        ['Longitud mínima de la contraseña', `${limits.minPasswordLength} caracteres`, 'MIN_PASSWORD_LENGTH'],
        ['Longitud máxima de una búsqueda', `${limits.searchMaxQueryLength} caracteres`, 'SEARCH_MAX_QUERY_LENGTH'],
        ['Notas omitidas en la búsqueda', `más de ${limits.searchMaxFileMB} MB`, 'SEARCH_MAX_FILE_MB'],
        ['Datos leídos por búsqueda', `${limits.searchMaxScannedMB} MB`, 'SEARCH_MAX_SCANNED_MB'],
        ['Búsquedas por minuto', `${limits.searchRateMax}`, 'SEARCH_RATE_MAX'],
        ['Resultados de búsqueda', `${limits.searchMaxResults} archivos`, 'SEARCH_MAX_RESULTS'],
        ['Coincidencias por archivo', `${limits.searchMaxMatchesPerFile}`, 'SEARCH_MAX_MATCHES_PER_FILE'],
        ['Duración máxima de la sesión', `${limits.sessionMaxDays} días`, 'SESSION_MAX_DAYS'],
        ['Caducidad por inactividad', `${limits.sessionIdleDays} días`, 'SESSION_IDLE_DAYS'],
      ]
    : [];

  return (
    <>
      <div className="settings-group">
        <div className="setting-item">
          <div className="setting-info">
            <div className="setting-name">Versión {__APP_VERSION__}</div>
            <div className="setting-desc">Obsidian Web</div>
          </div>
        </div>
      </div>
      {limits && (
        <div className="settings-group">
          <div className="settings-nav-title">Límites del servidor</div>
          <div className="setting-desc" style={{ marginBottom: 8 }}>
            Se cambian con variables de entorno en el servidor (ver <code>.env.example</code>) y requieren reiniciarlo.
          </div>
          {rows.map(([name, value, env]) => (
            <div className="setting-item" key={env}>
              <div className="setting-info">
                <div className="setting-name">{name}</div>
                <div className="setting-desc">
                  <code>{env}</code>
                </div>
              </div>
              <div>{value}</div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

export default function SettingsModal({ onClose }: Props) {
  const [section, setSection] = useState('about');
  const [query, setQuery] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const sections = SECTIONS.filter((s) => s.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="settings-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="settings-titlebar">
          <span>Preferencias</span>
          <button className="icon-btn" title="Cerrar" onClick={onClose}>
            <IconClose size={16} />
          </button>
        </div>
        <div className="settings-body">
          <nav className="settings-sidebar">
            <div className="settings-search">
              <IconSearch size={14} />
              <input
                placeholder="Buscar ajustes..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="settings-nav-title">Opciones</div>
            {sections.map(({ id, label, Icon }) => (
              <div
                key={id}
                className={`settings-nav-item ${section === id ? 'active' : ''}`}
                onClick={() => setSection(id)}
              >
                <Icon size={16} />
                <span>{label}</span>
              </div>
            ))}
          </nav>
          <div className="settings-content">
            {section === 'about' && <AboutSection />}
            {section === 'appearance' && <AppearanceSection />}
            {section === 'editor' && <EditorSection />}
            {section === 'files' && <FilesSection />}
            {section === 'sync' && <SyncSection />}
            {section === 'security' && <SecuritySection />}
            {section === 'shortcuts' && <ShortcutsSection />}
          </div>
        </div>
      </div>
    </div>
  );
}

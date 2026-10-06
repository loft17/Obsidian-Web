# Troubleshooting Obisidan Web

## Error 500 en POST /api/setup/init

### Causas comunes:

#### 1. **Problemas con scrypt-async**
```bash
# Verifica que scrypt-async está instalado
npm list scrypt-async

# Si falta, instálalo:
npm install scrypt-async
```

#### 2. **Ruta del vault no válida**
- La ruta debe ser absoluta (ej: `/home/user/my-vault` o `C:\Users\user\vault`)
- El usuario debe tener permisos de escritura en esa carpeta
- En Linux: `chmod 755 /ruta/del/vault`

#### 3. **Permisos en carpeta data/**
```bash
# Asegurar que ObiWEB puede escribir en data/
chmod 755 /path/to/obiweb/data

# Si es un usuario específico:
sudo chown -R app-user:app-user /path/to/obiweb/data
```

#### 4. **Ver logs del servidor**
```bash
# Si usas npm start directamente:
npm start 2>&1 | tee server.log

# Si usas PM2:
pm2 logs obiweb --lines 50
```

Los logs te dirán exactamente dónde falló.

---

## Error 400 en GET /api/files/tree

### Causas comunes:

#### 1. **Setup no completado**
- Verifica que `data/config.json` existe
```bash
cat data/config.json
```
Debe verse algo como:
```json
{
  "vaultPath": "/home/user/my-vault",
  "passwordHash": "abc123...",
  "port": 3000,
  "createdAt": "2026-10-05T..."
}
```

#### 2. **El servidor no releyó el config después del setup**
- En el navegador: abre las DevTools (F12)
- Consola: verás si el setup se completó exitosamente
- Si dice "configured: true" pero `/api/files/tree` falla igual, restart el servidor:
```bash
pm2 restart obiweb
# o Ctrl+C y npm start de nuevo
```

#### 3. **Ruta del vault no existe o no es accesible**
```bash
# Verifica que la ruta existe y tiene archivos
ls -la /home/user/my-vault
```

---

## Pantalla de login aparece pero la contraseña no funciona

#### 1. **¿Está correcta la contraseña?**
- Recuerda: la contraseña se setupea al inicio (no es "123456")
- Si olvidaste, borra `data/config.json` y vuelve a hacer setup

#### 2. **Las contraseñas se hashean con scrypt**
```bash
# Si necesitas resetear:
rm data/config.json
# Luego F5 en el navegador y vuelve al setup
```

---

## La página sigue pidiendo Setup después de F5

### Checklist:

1. **¿Se guardó config.json?**
```bash
ls -l data/config.json
```

2. **¿El servidor refresca correctamente?**
```bash
# Revisa los logs:
npm start

# Deberías ver "Setup required" o "Vault: /ruta/del/vault"
```

3. **¿Hay error silencioso en setup?**
```bash
# Abre DevTools (F12) → Consola → verifica si hay errores
# En Network → verifica el response de POST /api/setup/init
```

4. **Solución nuclear: reinicia todo**
```bash
# Mata el servidor
pkill -f "node server"
# o Ctrl+C si está en foreground

# Limpia la sesión del navegador
# DevTools → Application → Clear storage

# Vuelve a iniciar
npm start
```

---

## Errores de conexión (DNS, timeout)

### Si ves "failed to fetch"

#### 1. **¿El servidor está corriendo?**
```bash
curl http://localhost:3000
# Debería devolver HTML, no error de conexión
```

#### 2. **¿Firewall permite el puerto?**
```bash
# En el VPS, abre el puerto (si usas ufw):
sudo ufw allow 3000

# O iptables:
sudo iptables -A INPUT -p tcp --dport 3000 -j ACCEPT
```

#### 3. **¿La URL es correcta?**
- Si es local: `http://localhost:3000` o `http://127.0.0.1:3000`
- Si es VPS remoto: `http://tu-vps-ip:3000`
- Verifica que el IP/dominio es accesible (no está bloqueado por firewall)

---

## Cómo reportar un bug

1. Abre DevTools (F12)
2. Copia los logs de Consola
3. También copia los logs del servidor:
```bash
npm start > server-logs.txt 2>&1
# Intenta reproducir el bug
# Ctrl+C
# cat server-logs.txt
```
4. Comparte ambos

---

## Archivos que pueden resetear estado

Si algo se rompió totalmente:

```bash
# Borrar configuración (vuelve al setup)
rm data/config.json

# Borrar sesión
rm data/.secret

# Borrar todo
rm -rf data/

# Reconstruir frontend
rm -rf web/dist web/node_modules
npm install
```

---

## Rendimiento lento

- Si tienes un vault muy grande (1000+ archivos), el árbol tarda
- Solución futura: virtual scrolling en FileExplorer
- Por ahora: es normal en fase MVP

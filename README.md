# Planilla de Pagos PDA

Sistema interno de gestión de solicitudes de pago para el grupo **Open Cars** (Forte Car, Granville, Pampawagen). Maneja el ciclo completo: carga de solicitudes → autorización PDA → autorización Finanzas → pago → histórico.

## Stack

| Capa         | Tecnología                                                           |
| ------------ | -------------------------------------------------------------------- |
| Frontend     | Vanilla HTML/CSS/JS (SPA)                                            |
| Estilos      | Tailwind CSS + Font Awesome                                          |
| Backend      | Node.js + Express 4                                                  |
| Persistencia | JSON en disco (`data/planilla-pda.json`) con fallback a localStorage |
| Contenedor   | Docker (node:20-alpine)                                              |

## Funcionalidades principales

- **Carga manual** de solicitudes de pago con validación de 72 h hábiles (feriados argentinos, cutoff 13:00)
- **Carga masiva** por Excel (plantilla descargable con previsualización)
- **Extracción de cupones PDF** para Forte Car y Pampawagen
- **Flujo de autorización** de 2 etapas (PDA → Finanzas) con contraseña y sesión de 3 min
- **Exportaciones**: planilla de pago, histórica, abonados y GRL (Granville)
- **Filtro por rango de fechas** de vencimiento (desde/hasta, hábiles por defecto)
- **Carga de comprobantes** de pago
- **Vista histórica** de pagados y eliminados

## Ejecutar

```bash
npm install
npm start
# → http://localhost:3000
```

O con Docker:

```bash
docker build -t planilla-pda .
docker run -p 3000:3000 -v $PWD/data:/app/data planilla-pda
```

## Estructura

```
├── index.html           # SPA completa (HTML+CSS+JS ~3850 líneas)
├── server.js            # Backend Express
├── package.json
├── Dockerfile
├── start_prod.ps1       # Script de deploy Windows
└── data/planilla-pda.json  # Datos en producción
```

---

## Puntos a mejorar

### Técnicos

- [ ] **Migrar a base de datos** (SQLite, PostgreSQL o similar) en lugar de JSON en disco para evitar corrupción, mejorar concurrencia y permitir consultas
- [ ] **Autenticación de usuarios** real (login con roles: solicitante, PDA, finanzas, admin) en lugar de contraseñas hardcodeadas en el frontend
- [ ] **Desacoplar frontend de backend**: separar `index.html` en múltiples archivos JS con un bundler (Vite, Webpack) y un framework moderno (React, Vue)
- [ ] **Manejo de archivos**: almacenar adjuntos y comprobantes en disco o S3 en lugar de localStorage (límite de 5-10 MB)
- [ ] **Rate limiting** y validación del lado del servidor para evitar abuso de los endpoints
- [ ] **Logging estructurado** (Winston, Pino) para auditoría de operaciones
- [ ] **Pruebas**: agregar tests unitarios e integración (Vitest, Playwright)
- [ ] **TypeScript** para reducir errores en frontend y backend
- [ ] **CSRF Protection** y sanitización de entrada en el servidor

### UX / Funcionales

- [ ] **Notificaciones** por email o in-app cuando una solicitud cambia de estado
- [ ] **Panel de dashboard** con indicadores (solicitudes pendientes, montos totales, tiempos de aprobación)
- [ ] **Modo oscuro** consistente (actualmente el CSS tiene variables pero no se aplican)
- [ ] **Paginación** en tablas con muchos registros
- [ ] **Edición en lote** (multi-select) para acciones como autorización masiva
- [ ] **Historial de cambios** por registro (quién modificó qué y cuándo)
- [ ] **Internacionalización**: soporte para otros formatos de moneda y calendario
- [x] **Responsive básico** para dispositivos móviles (formulario adaptativo por media queries, flex-wrap en filtros, botones full-width en <640px)
- [ ] **Vista simplificada mobile** para tablas (mostrar solo columnas esenciales en pantallas chicas)

### Infraestructura

- [ ] **CI/CD** con GitHub Actions (lint, test, build, deploy)
- [ ] **Variables de entorno** para toda la configuración sensible (passwords, rutas, puerto)
- [ ] **Backups automáticos** del archivo de datos
- [ ] **HTTPS** con certificado Let's Encrypt o proxy reverse (nginx)
- [ ] **Monitoreo** de salud del servidor (health check endpoint, uptime)
# Ponos

## 1. Projektoverblik

**Ponos** er en digital platform til data, koordinering og indsigt for virksomheder/organisationer (fx Roskilde Festival som første use case, men bygget generisk).

Platformen bygger på tre grundspørgsmål:
- **Hvad har vi?** → Datalayer (items, kategorier, lokationer)
- **Hvem gør hvad?** → Opgavesystem (tasks, ansvarlige, deltagere)
- **Hvad fortæller data os?** → Dashboard & statistik (auto-genereret ud fra eksisterende data)

Platformens sider (jf. projektbeskrivelsen): Forside, Om os, Kontakt, Login, Dashboard, Opgaver, Statistik, Datalayer, Bruger.

## 2. Tech stack

| Del | Valg |
|---|---|
| Backend | Supabase (Auth + Postgres) |
| Frontend | React + TypeScript + Tailwind CSS + Lucide (ikoner) |
| State management | **Redux Toolkit** (globalt store, se afsnit 7) |
| Routing | react-router-dom |
| Versionsstyring | GitHub |
| Deployment | Vercel |

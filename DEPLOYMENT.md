# RENDER DEPLOYMENT - USE THESE EXACT VALUES

## Your Database Info (already working):
- Host: dpg-d6prmbfgi27c73bfg9rg-a.oregon-postgres.render.com
- Port: 5432
- Database: eggcellent_db
- User: eggcellent_db_user
- Password: UQvtKAZIPKbfd8aiaatdbmw0tm873ILZ

---

## BACKEND - Add these 12 Variables:

| # | KEY | VALUE |
|---|-----|-------|
| 1 | DEBUG | False |
| 2 | DJANGO_SECRET_KEY | (click Generate) |
| 3 | POSTGRES_DATABASE | eggcellent_db |
| 4 | POSTGRES_USER | eggcellent_db_user |
| 5 | POSTGRES_PASSWORD | UQvtKAZIPKbfd8aiaatdbmw0tm873ILZ |
| 6 | POSTGRES_HOST | dpg-d6prmbfgi27c73bfg9rg-a.oregon-postgres.render.com |
| 7 | POSTGRES_PORT | 5432 |
| 8 | EMAIL_HOST_USER | Eggcellentsales60@gmail.com |
| 9 | EMAIL_HOST_PASSWORD | jjpicurzkqgmvbhn |
| 10 | EMAIL_USE_TLS | True |
| 11 | EMAIL_PORT | 587 |
| 12 | DEFAULT_FROM_EMAIL | Eggcellentsales60@gmail.com |

Other settings:
- Dockerfile Path: Dockerfile

Click "Deploy Web Service"

---

## FRONTEND - Add 1 Variable:

| KEY | VALUE |
|-----|-------|
| VITE_API_URL | https://eggcellent-backend.onrender.com/api |

Other settings:
- Dockerfile Path: Dockerfile.frontend

Click "Deploy Web Service"

---

## DONE!

# Telegram Bot Builder (Django) — конструктор Telegram-ботов

Система-конструктор для создания и управления Telegram-ботами без написания кода: визуальный редактор сценариев, настройка структуры данных, запуск/остановка ботов, просмотр пользователей бота.

Проект ориентирован на автоматизацию бизнес-процессов и быстрые изменения сценариев без дорогой индивидуальной разработки. :contentReference[oaicite:1]{index=1}

---

## Возможности

- **Создание и управление ботами**
  - добавление бота по токену
  - список “моих ботов”, статус активности
  - запуск/остановка
  - конфигурирование сценария

- **Визуальный конструктор сценариев**
  - редактор flow-схем (узлы/связи)
  - блоки сообщений/кнопок/условий/ввода данных
  - сохранение схемы в JSON

- **Настройка данных (DB)**
  - создание таблиц и полей под конкретного бота
  - операции со структурой/данными/импортом

- **Пользователи бота**
  - список пользователей, активность, метрики (базово)

- **Генерация и запуск бота**
  - генерация кода/конфига бота на основе схемы
  - выполнение (runner) и обработка апдейтов Telegram

> В проекте использованы Django + DRF, Aiogram, MySQL/SQLite и фронтенд на React + React-Flow + Material-UI. :contentReference[oaicite:2]{index=2}

---

## Архитектура (кратко)

- **Backend (Django + DRF)** отвечает за:
  - авторизацию/пользователей
  - хранение `TelegramBot` (токен, config, schema, is_active)
  - API для создания/управления ботами, схемами и данными

- **Bot Generator** — формирует код/конфиг бота по схеме  
- **DB Generator** — поднимает структуру БД под бота  
- **Bot Runner** — запускает/останавливает бота (aiogram)  

Общая логика: пользователь собирает flow → сохраняется схема → генератор формирует конфиг/код → runner запускает бота. :contentReference[oaicite:3]{index=3}

---

## Технологии

**Backend**
- Python / Django
- Django REST Framework
- Aiogram (Telegram Bot API)
- MySQL или SQLite :contentReference[oaicite:4]{index=4}

**Frontend**
- React.js
- React-Flow
- Material-UI :contentReference[oaicite:5]{index=5}

---

## Быстрый старт (локально)

> Команды ниже — шаблон. Подстрой под структуру репозитория (папки `backend/`, `frontend/` и т.п.).

### 1) Backend

```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt



### Пример env.
DJANGO_SECRET_KEY=change-me
DJANGO_DEBUG=1
ALLOWED_HOSTS=127.0.0.1,localhost

# DB (вариант 1 — SQLite)
DB_ENGINE=sqlite

# DB (вариант 2 — MySQL)
DB_ENGINE=mysql
DB_NAME=botbuilder
DB_USER=root
DB_PASSWORD=pass
DB_HOST=127.0.0.1
DB_PORT=3306

# Telegram
TELEGRAM_WEBHOOK_URL= # если используешь webhook


### Миграции и запуск:
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver

### 2) Frontend
cd frontend
npm install
npm run dev

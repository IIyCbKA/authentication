# Django Rest Framework Server for Authentification

## 1. Installation and setup

#### 1. **Install dependencies**  
   ```bash
   pip install -r requirements-base.txt
   ```

#### 2. **Set up PostgreSQL**
Create the database and user in your `.env` from project root settings and grant necessary privileges.

## 2. Running the server

#### 1. **Apply migrations**

   ```bash
   python manage.py migrate
   ```

#### 2. **Run development server**

   ```bash
   python manage.py runserver
   ```

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

## 3. API documentation

After installing dependencies, open `/docs/` on the server for Swagger UI.
The OpenAPI schema is available at `/schema/` (or `/schema/?format=json`).
Both pages are public, including when `DEBUG=False`.

Request schemas come from the existing serializers; `@extend_schema` describes
responses and parameters that cannot be inferred automatically.

For request bodies, choose `application/json`. To try protected endpoints,
paste an `accessToken` into **Authorize**, without
the `Bearer` prefix. Registration returns a pending token: use it to confirm
email, then authorize with the new token for account endpoints.

Request bodies accept both snake_case and camelCase field names. The schema
uses camelCase, matching the JSON response format.

Refresh tokens are HttpOnly cookies, not JSON fields. Swagger UI on the same
server uses the browser's cookies; it cannot manually set a Cookie header.
Cookie-changing requests also require an allowed Origin; browsers set the
actual header automatically. Keep the existing HTTPS/cookie settings in mind
when testing locally. Swagger UI assets load from a CDN.

OAuth login is a browser navigation flow, not a Swagger **Try it out** request.
Open `/auth/oauth/github/start/?next=/` in the browser to start it (replace the
provider as needed). Linking uses POST with `flow=link`, then navigation to the
returned `authorizationUrl`. With a valid state and session, provider-reported
errors (including cancellation) redirect to the saved, validated `next` URL or
`CLIENT_BASE_URL`. Other callback errors return JSON.

To export and validate the schema without running the server:

```bash
python manage.py spectacular --file schema.yml --validate --fail-on-warn
```

# Vimala S. Portfolio

This is the existing static portfolio. Its chatbot now answers from a small, verified knowledge base in `script.js` using vanilla JavaScript keyword matching. It does not call an AI model, external API, serverless function, or `/api/chat` endpoint. The portfolio, profile image, resume, and section layout remain part of the same site.

## Run the portfolio locally

No Python backend or API key is needed for the browser-only chatbot.

From the project root, either use the VS Code Live Server extension or run:

```powershell
py -m http.server 5500
```

Then open <http://127.0.0.1:5500>. The chatbot answers from the project facts stored in `script.js` and works on the deployed static Netlify site as well.

## Chatbot knowledge

The local knowledge is based on `index.html` and `assets/resume.pdf`. It includes education, skills, the project names verified in those files, and the email, phone, LinkedIn, and GitHub links already in the portfolio. Spoken-language proficiency is not listed in those source files, so the chatbot says it is unspecified. Project labels that do not appear in the portfolio/resume are not treated as verified facts.

## Existing FastAPI backend

The `backend/` FastAPI service, `render.yaml`, and backend tests are retained in the project, but the portfolio chatbot no longer calls that service. They can still be used independently; deploying them is not required for this chatbot.

For independent local API development, the backend reads `backend/.env` or hosting environment variables. Use `GROQ_API_KEY`, `AI_API_URL`, and `AI_MODEL`; `AI_API_KEY` remains accepted as a legacy fallback. Keep the real key only in the backend environment and never commit `.env` files. The Render manifest configures the separate API service and Netlify CORS origin but is not used by the browser-only chat flow.

To run the retained API separately, from a terminal in `backend/`:

```powershell
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

The health route is `/api/health` and the independent chat route is `/api/chat`.

## Checks

With the project virtual environment active, run the existing mocked backend checks from the project root:

```powershell
.\.venv\Scripts\python.exe -m pytest backend\tests -q
```

These tests exercise the retained FastAPI service; they do not power the static portfolio chatbot.

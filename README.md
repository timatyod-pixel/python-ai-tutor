# Harvard Python AI Tutor — independent CS50P study website

Responsive website with AI chat, CS50P learning roadmap, practice and progress tracking.
Not affiliated with or endorsed by Harvard University.

## Run locally
1. Install Node.js 20+.
2. In this folder run: `npm start`.
3. Open `http://localhost:3000`.

Without an API key, the site loads in **demo mode** with a limited, explicitly labelled set of scripted Python explanations. It is not a true AI conversation until connected.

## Enable real AI tutoring
Set `OPENAI_API_KEY` in the **server's environment variables**, never in public HTML/JS or a shared .env file. Optionally set `OPENAI_MODEL` (default `gpt-4.1-mini`). Restart server.

The backend calls the OpenAI Chat Completions API and fetches relevant excerpts from 11 user-provided CS50P transcript text files in `knowledge/`. API usage may incur costs. Check model access and host egress availability. There is simple per-IP throttling (12 requests/minute), but for a public launch add abuse protection, cost limits, privacy policy and optionally authentication. The frontend stores lesson checkmarks in browser localStorage only; conversation is not saved to the server. Requests are sent to OpenAI when live AI is enabled.

## Publish
Deploy **the entire project** to a Node.js host (e.g., Render, Railway, Fly.io), set build command empty or `npm install`, start command `npm start`, and set `OPENAI_API_KEY` as a protected host environment variable. A static-only host such as Netlify Drop cannot run `server.js` by itself.

To avoid deploying transcript text, keep `knowledge/` server-side; the server prevents serving this directory through HTTP.

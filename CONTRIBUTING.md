# Contributing to OpenRadar AI

We welcome contributions from the community! Whether you want to add new ingestion sources, improve threat modeling heuristics, or polish the cyber command center UI, here is how you can help.

## Development Setup

1. Fork and clone the repository:
   ```bash
   git clone https://github.com/<your-username>/openradar-ai.git
   cd openradar-ai
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Run the standalone python agent:
   ```bash
   python3 agent_scan.py
   ```

## Guidelines

- Follow existing TypeScript and Tailwind design token conventions.
- Maintain dark-mode first cyberpunk aesthetic and glassmorphism styling standards.
- Write meaningful commit messages and open a PR with a description of your changes.

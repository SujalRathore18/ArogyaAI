# Uploading to GitHub

## Option A — Using the terminal (recommended)

1. **Create a new empty repository on GitHub:**
   - Go to https://github.com/new
   - Give it a name (e.g. `arogya-ai`)
   - Leave "Initialize with README" **unchecked** (you already have one)
   - Click "Create repository"
   - Copy the repository URL it shows you (looks like
     `https://github.com/yourusername/arogya-ai.git`)

2. **Open a terminal in your project folder and run:**
   ```bash
   cd path/to/ArogyaAI
   git init
   git add .
   git commit -m "Initial commit — ArogyaAI prototype"
   git branch -M main
   git remote add origin https://github.com/yourusername/arogya-ai.git
   git push -u origin main
   ```

3. If prompted for credentials, GitHub no longer accepts your account
   password for this — you'll need a Personal Access Token instead:
   - https://github.com/settings/tokens → "Generate new token (classic)"
   - Check the `repo` scope, generate it, and paste it in as the password
     when Git asks.

## Option B — GitHub Desktop (no terminal needed)

1. Install GitHub Desktop: https://desktop.github.com
2. Sign in with your GitHub account
3. File → Add Local Repository → select your `ArogyaAI` folder
4. If it says "this isn't a Git repository yet," click "create a repository"
5. Write a commit message (e.g. "Initial commit") → "Commit to main"
6. Click "Publish repository" at the top

## Important — before you push

Double-check your `.env` files are **not** being committed (they contain
secrets like your database URL and JWT secret). This project's `.gitignore`
already excludes `.env` and `.env.local`, so as long as you didn't rename
them, you're safe. You can verify with:

```bash
git status
```
If you see `.env` listed as a file about to be committed, stop and check
your `.gitignore` before pushing.

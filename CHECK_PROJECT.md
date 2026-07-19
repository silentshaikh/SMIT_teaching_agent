# Project Health Check Commands

Run these commands to verify the project is clean and all tests pass.

---

## 1. Verify No Hardcoded Secrets

```powershell
# Search for OpenRouter API keys in all source files
Select-String -Path "smit-backend\**\*.py","smit-frontend\**\*.ts","smit-frontend\**\*.tsx" -Pattern "sk-or-v1-"

# Search git history for leaked keys
git log --all -p | Select-String -Pattern "sk-or-v1-"
```

**Expected:** No output (no matches).

---

## 2. Backend Tests (124 tests)

```powershell
cd smit-backend
python -m pytest tests/test_schemas.py tests/test_agent_config.py tests/test_tools.py tests/test_agents.py tests/test_api_endpoints.py tests/test_api_report.py -v
```

**Expected:** `124 passed`

---

## 3. Backend Coverage

```powershell
cd smit-backend
python -m pytest tests/test_schemas.py tests/test_agent_config.py tests/test_tools.py tests/test_agents.py tests/test_api_endpoints.py tests/test_api_report.py --cov=. --cov-report=term-missing
```

**Expected:** `91%+` coverage.

---

## 4. Frontend Tests (50 tests)

```powershell
cd smit-frontend
npm test
```

**Expected:** `50 passed`

---

## 5. Frontend Build

```powershell
cd smit-frontend
npx next build
```

**Expected:** Build succeeds with no errors.

---

## 6. TypeScript Type Check

```powershell
cd smit-frontend
npx tsc --noEmit
```

**Expected:** No type errors.

---

## 7. .env Files Present

```powershell
# Verify .env exists (for runtime)
Test-Path smit-backend\.env
Test-Path smit-frontend\.env

# Verify .env.example exists (for documentation)
Test-Path smit-backend\.env.example
Test-Path smit-frontend\.env.example
```

**Expected:** All return `True`.

---

## 8. .gitignore Protects .env

```powershell
Select-String -Path "smit-backend\.gitignore" -Pattern "^\.env$"
```

**Expected:** Match found on line 9.

---

## Quick One-Liner (All Checks)

```powershell
# Run all backend + frontend tests in sequence
cd smit-backend; python -m pytest tests/test_schemas.py tests/test_agent_config.py tests/test_tools.py tests/test_agents.py tests/test_api_endpoints.py tests/test_api_report.py -q; cd ../smit-frontend; npm test
```

---

## After Pushing to GitHub

If GitHub Push Protection still blocks, run:

```powershell
# Double-check no secrets anywhere
git log --all -p | Select-String -Pattern "sk-|api_key|secret|token|password" -Context 1
```

If a match is found, identify the file and replace the value with an environment variable reference.

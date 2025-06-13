# CI/CD Setup Guide

This document explains the GitHub Actions workflows configured for the EasyLLM project.

## 🔄 Continuous Integration (CI)

### Main CI Workflow (`.github/workflows/ci.yml`)

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches

**Jobs:**

#### 1. **Test Job**
- **Matrix Testing**: Runs on Node.js versions 16.x, 18.x, and 20.x
- **Steps:**
  - Checkout code
  - Setup Node.js with npm cache
  - Install dependencies (`npm ci`)
  - Run linter (if available)
  - Build project (`npm run build`)
  - Run unit tests (`npm run test:unit`)
  - Run integration tests (if API keys provided)
  - Generate test coverage
  - Upload coverage to Codecov

#### 2. **Build Check Job**
- **Purpose**: Verify build artifacts and type checking
- **Steps:**
  - Type check with TypeScript (`tsc --noEmit`)
  - Production build verification
  - Check that required build artifacts exist

#### 3. **Security Job**
- **Purpose**: Security vulnerability scanning
- **Steps:**
  - Run npm audit for known vulnerabilities
  - Check production dependencies

### Environment Variables

Set these as GitHub Secrets for full functionality:

```bash
# Required for integration tests (optional)
LLM_VIN_API_KEY=your_llm_vin_api_key
OPENAI_API_KEY=your_openai_api_key


# Required for NPM publishing
NPM_TOKEN=your_npm_token
```

## 📦 Publishing Workflow (`.github/workflows/publish.yml`)

**Triggers:**
- GitHub release created
- Manual workflow dispatch

**Features:**
- Automatic version bumping
- NPM package publishing
- Git tag creation and pushing

**Manual Trigger:**
```bash
# Go to Actions tab in GitHub and run "Publish to NPM"
# Choose version bump: patch, minor, or major
```

## 🤖 Dependabot Configuration

### Auto-dependency Updates (`.github/dependabot.yml`)

**NPM Dependencies:**
- Weekly updates on Mondays at 9:00 AM
- Maximum 10 open PRs
- Automatic labeling and assignment

**GitHub Actions:**
- Weekly updates for workflow dependencies
- Maximum 5 open PRs
- Automatic security updates

### Auto-merge (`.github/workflows/dependabot-auto-merge.yml`)

**Purpose:** Automatically merge Dependabot PRs that pass tests

**Process:**
1. Dependabot creates PR
2. CI runs automatically
3. If tests pass, PR is auto-merged
4. If tests fail, PR requires manual review

## 🚀 Setting Up CI/CD for Your Fork

### 1. Enable GitHub Actions
```bash
# Actions are enabled by default, but verify in:
# Repository Settings → Actions → General → Allow all actions
```

### 2. Add Repository Secrets
```bash
# Go to: Repository Settings → Secrets and variables → Actions

# Add these secrets:
LLM_VIN_API_KEY=your_api_key      # Optional: for integration tests
OPENAI_API_KEY=your_api_key       # Optional: for OpenAI integration tests
NPM_TOKEN=your_npm_token          # Required: for publishing
```

### 3. Configure NPM Publishing
1. Create NPM account and get token:
   ```bash
   npm login
   npm token create --read-only
   ```
2. Add token as `NPM_TOKEN` secret

## 📊 Status Badges

Status badges can be added to the README once the GitHub repository is created:

- **CI Status**: `[![CI](https://github.com/username/easyllm/actions/workflows/ci.yml/badge.svg)](https://github.com/username/easyllm/actions/workflows/ci.yml)`
- **NPM Version**: `[![npm version](https://badge.fury.io/js/easyllm.svg)](https://badge.fury.io/js/easyllm)`

## 🔧 Local Development

### Run CI Checks Locally
```bash
# Install dependencies
npm ci

# Run all checks that CI runs
npm run build          # TypeScript build
npm run test:unit      # Unit tests
npm run lint          # Linting (if configured)

# Type checking
npx tsc --noEmit

# Security audit
npm audit
```

### Testing Integration Tests Locally
```bash
# Set environment variables
export LLM_VIN_API_KEY=your_key
export OPENAI_API_KEY=your_key

# Run integration tests
npm run test:integration
```

## 🛠️ Customization

### Adding New Workflows
Create new `.yml` files in `.github/workflows/`:

```yaml
name: Custom Workflow
on: [push]
jobs:
  custom:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Custom step
        run: echo "Custom action"
```

### Modifying Test Matrix
Edit `.github/workflows/ci.yml`:

```yaml
strategy:
  matrix:
    node-version: [18.x, 20.x, 21.x]  # Add/remove versions
    os: [ubuntu-latest, windows-latest]  # Add OS matrix
```

### Branch Protection Rules
Configure in Repository Settings → Branches:

- Require PR reviews
- Require status checks (CI)
- Require up-to-date branches
- Restrict force pushes

## 📈 Monitoring

### GitHub Actions
- View workflow runs in the "Actions" tab
- Check logs for failed runs
- Monitor workflow usage and billing

### Notifications
Configure in GitHub Settings → Notifications:
- Email notifications for failed workflows
- Slack/Discord integration for team notifications

## 🔒 Security Best Practices

1. **Never commit secrets** to the repository
2. **Use repository secrets** for sensitive data
3. **Limit workflow permissions** to minimum required
4. **Regularly update dependencies** via Dependabot
5. **Monitor security advisories** and audit results
6. **Review Dependabot PRs** before auto-merge when possible

This CI/CD setup ensures code quality, security, and reliable releases for the EasyLLM project.
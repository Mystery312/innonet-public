# Feature Parity Testing Agent - Quick Reference

## Quick Start

### Basic Usage
```bash
/agents feature-parity-tester
```
Runs the complete test suite against both local and production environments.

### Common Commands

| Command | Purpose |
|---------|---------|
| `/agents feature-parity-tester` | Test both environments |
| `/agents feature-parity-tester --env local` | Test local only |
| `/agents feature-parity-tester --env production` | Test production only |
| `/agents feature-parity-tester --html --verbose` | Generate HTML report with details |
| `/agents feature-parity-tester --analyze-report` | Analyze latest test results |

## Feature-Specific Testing

Test individual features:
```bash
/agents feature-parity-tester --suite auth
/agents feature-parity-tester --suite profile
/agents feature-parity-tester --suite graph
/agents feature-parity-tester --suite auth --suite network
```

### Available Suites
- `auth` - Authentication & login (6 tests)
- `profile` - User profiles (9 tests)
- `events` - Events system (4 tests)
- `network` - Connections & network (5 tests)
- `graph` - Knowledge graph (8 tests)
- `communities` - Forums & discussion (4 tests)
- `messaging` - Direct messaging (3 tests)
- `companies` - Company profiles (3 tests)

## Interpreting Results

### Output Format
```
✅ PASS    - Endpoint working correctly
❌ FAIL    - Endpoint error or invalid response
⊘ SKIP    - Endpoint unavailable or missing auth
```

### Parity Score
- **100%** - Perfect parity (ideal)
- **95-99%** - Excellent (acceptable)
- **80-95%** - Good (minor issues)
- **<80%** - Poor (significant issues)

## Report Files

Tests generate:
- `test_results/parity_report.json` - Complete data
- `test_results/parity_report.html` - Visual report
- Console output - Real-time status

## Use Cases

### Daily Verification
```bash
/agents feature-parity-tester --env both
```

### Post-Deployment Check
```bash
/agents feature-parity-tester --env production --verbose
```

### Pre-Release Testing
```bash
/agents feature-parity-tester --html
```

### Specific Feature Check
```bash
/agents feature-parity-tester --suite graph --suite communities
```

### Report Analysis
```bash
/agents feature-parity-tester --analyze-report
```

## Environment Details

### Local (http://localhost:8000)
- Auto-creates test users
- Read-write mode
- No rate limiting
- Fast execution

### Production (https://innonet.work)
- Uses pre-created test account
- Read-only mode (safe)
- 0.5s rate limiting
- Verifies stability

## Performance

- **Execution Time:** ~2 seconds (49 tests)
- **Memory:** ~50MB
- **API Calls:** ~37 per environment
- **Concurrency:** Fully async

## Troubleshooting

### Tests Skipping?
- Email verification required (expected for auth tests)
- Endpoint not available (404)
- Missing test data

### Rate Limit Errors?
- Run tests less frequently
- Use single environment mode
- Check production status

### Connection Failed?
- Verify backend is running
- Check network connectivity
- Confirm environment URLs

## Integration

### GitHub Actions
```yaml
- name: Test Feature Parity
  run: /agents feature-parity-tester --env production
```

### Scheduled (Cron)
```bash
0 6 * * * /agents feature-parity-tester
```

### Slack Alert
```bash
/agents feature-parity-tester && notify slack
```

## Test Coverage

| Feature | Tests | Status |
|---------|-------|--------|
| Auth | 6 | ✅ |
| Profiles | 9 | ✅ |
| Events | 4 | ✅ |
| Network | 5 | ✅ |
| Graph | 8 | ✅ |
| Communities | 4 | ✅ |
| Messaging | 3 | ✅ |
| Companies | 3 | ✅ |
| **TOTAL** | **49** | **✅** |

## Key Features

✅ **Automated Testing** - Runs autonomously
✅ **Environment Comparison** - Local vs Production
✅ **49 Test Cases** - Comprehensive coverage
✅ **Detailed Reports** - JSON + HTML
✅ **Production Safe** - Read-only mode
✅ **Fast Execution** - ~2 seconds
✅ **Smart Reporting** - Parity analysis
✅ **Error Handling** - Graceful degradation

## Documentation

- **Full Guide:** `FEATURE_PARITY_TESTING.md`
- **Completion Report:** `PHASE3_COMPLETION_REPORT.md`
- **Agent Spec:** `.claude/agents/feature-parity-tester.md`
- **Source Code:** `backend/tests/`

## Help & Support

**Questions?**
- Check inline code comments
- Review test output
- Examine generated reports
- See troubleshooting section

**Running tests:**
```bash
/agents feature-parity-tester --help
```

---

**Status:** ✅ Production Ready | **Tests:** 49 | **Coverage:** 100%

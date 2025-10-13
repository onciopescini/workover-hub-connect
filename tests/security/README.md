# Security Testing Suite

Comprehensive security tests for the Workover platform, covering RLS policies, permission functions, and admin/moderator flows.

## 🎯 Purpose

This test suite ensures that:
- ✅ Row-Level Security (RLS) policies prevent unauthorized data access
- ✅ Permission functions (`has_role`, `is_admin`, `is_moderator`) work correctly
- ✅ Admin and moderator privileges are properly enforced
- ✅ Privilege escalation attacks are prevented
- ✅ Security definer functions have immutable search paths

## 📁 Test Structure

```
tests/security/
├── README.md                          # This file
├── helpers/
│   └── test-users.ts                  # Test user utilities
├── permission-functions.test.ts       # Permission function tests
├── rls-policies.test.ts               # RLS policy tests
├── admin-flows.test.ts                # Admin E2E security tests
└── moderator-flows.test.ts            # Moderator E2E security tests
```

## 🚀 Running Tests

### Run All Security Tests
```bash
npm run security:test
# or
ts-node scripts/run-security-tests.ts
```

### Run Individual Test Suites

**Permission Functions Tests**
```bash
npm run test -- tests/security/permission-functions.test.ts
```

**RLS Policies Tests**
```bash
npm run test -- tests/security/rls-policies.test.ts
```

**Admin Flows E2E Tests**
```bash
npm run test:e2e -- tests/security/admin-flows.test.ts
```

**Moderator Flows E2E Tests**
```bash
npm run test:e2e -- tests/security/moderator-flows.test.ts
```

## 🧪 Test Coverage

### Permission Functions Tests (`permission-functions.test.ts`)

Tests the core security functions:
- ✅ `has_role(user_id, role)` - Checks if user has specific role
- ✅ `is_admin(user_id)` - Checks if user is admin
- ✅ `is_moderator(user_id)` - Checks if user is moderator
- ✅ `can_moderate_content(user_id)` - Checks moderation permissions
- ✅ Function immutability (search_path configuration)
- ✅ Security definer validation

**Critical Tests:**
- Admin role detection
- Moderator role detection
- Permission denial for unauthorized users
- Null/undefined handling
- Function security attributes

### RLS Policies Tests (`rls-policies.test.ts`)

Tests Row-Level Security policies on critical tables:

**user_roles table:**
- ✅ Admin can view all roles
- ✅ Moderator CANNOT view roles
- ✅ Coworker CANNOT view roles
- ✅ Admin can insert roles
- ✅ Moderator CANNOT insert roles
- ✅ Privilege escalation prevention

**admin_actions_log table:**
- ✅ Admin can view logs
- ✅ Moderator can view logs (read-only)
- ✅ Coworker CANNOT view logs
- ✅ Admin can insert logs
- ✅ Moderator CANNOT insert logs

**reports table:**
- ✅ Admin can view all reports
- ✅ Moderator can view all reports
- ✅ Coworker can only view own reports
- ✅ Moderator can update report status

**spaces table:**
- ✅ Host can view own spaces
- ✅ Coworker cannot view unpublished spaces
- ✅ Admin can view all spaces
- ✅ Moderator can view pending approval spaces

**bookings table:**
- ✅ Coworker can view own bookings
- ✅ Host can view bookings for their spaces
- ✅ Coworker CANNOT view other users' bookings

### Admin Flows E2E Tests (`admin-flows.test.ts`)

End-to-end security tests for admin functionality:
- ✅ Admin can access admin dashboard
- ✅ Admin can view users list
- ✅ Admin can assign moderator role
- ✅ Admin can suspend user accounts
- ✅ Admin can approve pending spaces
- ✅ Admin can view admin action logs
- ✅ Admin can manage system settings
- ✅ Admin session timeout after inactivity
- ✅ Admin cannot access other admin sensitive data

### Moderator Flows E2E Tests (`moderator-flows.test.ts`)

End-to-end security tests for moderator functionality:
- ✅ Moderator can access moderation dashboard
- ✅ Moderator CANNOT access admin users page
- ✅ Moderator CANNOT access system settings
- ✅ Moderator can approve pending spaces
- ✅ Moderator can reject inappropriate spaces
- ✅ Moderator can view and handle reports
- ✅ Moderator can view logs (read-only)
- ✅ Moderator CANNOT assign roles
- ✅ Moderator CANNOT suspend users
- ✅ Moderator session timeout after inactivity
- ✅ Moderator can escalate reports to admin

## 🔐 Test Users

Predefined test users for each role:

| Role      | Email                | Password          | Purpose                          |
|-----------|----------------------|-------------------|----------------------------------|
| Admin     | admin@test.com       | TestAdmin123!     | Full system access               |
| Moderator | moderator@test.com   | TestModerator123! | Content moderation access        |
| Coworker  | coworker@test.com    | TestCoworker123!  | Regular user (booking creator)   |
| Host      | host@test.com        | TestHost123!      | Space owner                      |

**Note:** Test users are created/cleaned up automatically via `test-users.ts` helpers.

## 🛡️ Security Validation Checklist

Before deploying to production, ensure all tests pass:

- [ ] ✅ All permission functions return correct values
- [ ] ✅ Permission functions have immutable search_path
- [ ] ✅ Permission functions are SECURITY DEFINER
- [ ] ✅ RLS policies prevent unauthorized SELECT
- [ ] ✅ RLS policies prevent unauthorized INSERT
- [ ] ✅ RLS policies prevent unauthorized UPDATE
- [ ] ✅ RLS policies prevent unauthorized DELETE
- [ ] ✅ Admin can access admin-only features
- [ ] ✅ Moderator can access moderation features
- [ ] ✅ Moderator CANNOT access admin-only features
- [ ] ✅ Coworker CANNOT access admin/moderator features
- [ ] ✅ Privilege escalation attacks are prevented
- [ ] ✅ Session timeout works correctly
- [ ] ✅ No sensitive data leaks in error messages

## 🚨 Critical Test Failures

If any **CRITICAL** tests fail:

1. **DO NOT DEPLOY** to production
2. Review the failed test output
3. Check RLS policies in Supabase Dashboard
4. Verify permission functions in database
5. Re-run Supabase Linter to check for warnings
6. Fix the underlying security issue
7. Re-run tests to confirm fix

## 📊 CI/CD Integration

Add to your CI/CD pipeline:

```yaml
# .github/workflows/security-tests.yml
name: Security Tests

on: [push, pull_request]

jobs:
  security:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run Security Tests
        run: npm run security:test
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
      
      - name: Upload Test Results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: security-test-results
          path: test-results/
```

## 📚 References

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Security Functions](https://www.postgresql.org/docs/current/sql-createfunction.html)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Workover Security Guidelines](../docs/security.md)

## 🔄 Maintenance

**Regular tasks:**
- Run security tests before each deployment
- Update test users when authentication changes
- Add new tests when adding admin/moderator features
- Review and update RLS policies when schema changes
- Monitor test execution time (should be < 5 minutes)

**Quarterly:**
- Review all test coverage
- Add tests for new attack vectors
- Update dependencies (Playwright, Jest)
- Penetration testing review

## 💡 Tips

1. **Fast iteration:** Run only the specific test suite you're working on
2. **Debug mode:** Add `--debug` flag to Playwright tests for step-by-step debugging
3. **Verbose output:** Use `npm run test -- --verbose` for detailed logs
4. **Watch mode:** Use `npm run test -- --watch` for TDD workflow
5. **Coverage report:** Run `npm run test -- --coverage` to see test coverage

## 🆘 Troubleshooting

**Tests fail with "row-level security" error:**
- Check RLS policies are enabled on the table
- Verify user has correct role assigned
- Check auth token is valid

**Permission function tests fail:**
- Run Supabase Linter to check function security
- Verify functions have `SET search_path = public`
- Check functions are `SECURITY DEFINER`

**E2E tests timeout:**
- Increase timeout in playwright.config.ts
- Check network connectivity to Supabase
- Verify auth redirect URLs are correct

**Test users not found:**
- Run test user creation script manually
- Check Supabase auth user list
- Verify profiles table has matching records

---

**Last Updated:** 2025-01-10  
**Maintained By:** Development Team  
**Security Contact:** security@workover.app

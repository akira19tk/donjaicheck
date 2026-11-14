"""Public deployment checks for Donjaicheck. Credentials and session tokens are never printed.

WHAT THIS SCRIPT DOES
    Called by .github/workflows/deploy.yml after a deployment:
        python3 deploy/smoke_test.py SERVICE_URL
    It checks the live service and exits non-zero (failing the workflow) if a check fails.
    Each public check is retried up to 5 times, 3 seconds apart (Cloud Run cold starts).

    Checks (in order, all read-only)
      1. GET /api/health   -> {"status": "ok"}
      2. GET /api/ready    -> {"db": "connected"}                (proves the database works)
      3. GET /             -> HTML page                          (the built React app is served)
      4. GET /api/surveys  -> 401 {"code": "UNAUTHENTICATED"}   (protected API rejects anonymous users)
      5. OPTIONAL login    -> POST /api/auth/login, GET /api/auth/me, POST /api/auth/logout.
         Runs only if BOTH SMOKE_EMAIL and SMOKE_PASSWORD are set. Use a RESPONDENT test account,
         never an owner. The session is always logged out, even if a check fails.

    Donjaicheck uses an httpOnly session cookie (dc_session) and requires the header
    X-Requested-With: Donjaicheck on state-changing requests (CSRF defence, system-sds.md §4).

    Python standard library only. Offline unit tests: deploy/tests/test_smoke.py
"""
import json
import os
import sys
import time
import urllib.error
import urllib.request

CSRF_HEADER = {'X-Requested-With': 'Donjaicheck'}


def request(base, path, data=None, cookie=None, expect_status=200):
    """Returns (body, set_cookie). Raises ValueError when the status differs from expect_status."""
    headers = dict(CSRF_HEADER) if data is not None else {}
    if data is not None:
        headers['Content-Type'] = 'application/json'
    if cookie:
        headers['Cookie'] = cookie
    req = urllib.request.Request(base + path, headers=headers,
                                 data=json.dumps(data).encode() if data is not None else None,
                                 method='POST' if data is not None else 'GET')
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            status, body, set_cookie = response.status, response.read(), response.headers.get('Set-Cookie')
    except urllib.error.HTTPError as e:
        status, body, set_cookie = e.code, e.read(), None
    if status != expect_status:
        raise ValueError(f'{path}: HTTP {status}')
    return body, set_cookie


def session_cookie(set_cookie):
    if not set_cookie or not set_cookie.startswith('dc_session='):
        raise ValueError('No session cookie')
    return set_cookie.split(';', 1)[0]


def check(base):
    public = (
        ('/api/health', 200, lambda b: json.loads(b).get('status') == 'ok'),
        ('/api/ready', 200, lambda b: json.loads(b).get('db') == 'connected'),
        ('/', 200, lambda b: b'<html' in b.lower()),
        ('/api/surveys', 401, lambda b: json.loads(b).get('code') == 'UNAUTHENTICATED'),
    )
    for path, status, predicate in public:
        for attempt in range(5):
            try:
                body, _ = request(base, path, expect_status=status)
                if not predicate(body):
                    raise ValueError('Unexpected response')
                break
            except (urllib.error.URLError, TimeoutError, ValueError):
                if attempt == 4:
                    raise RuntimeError('Smoke check failed: ' + path) from None
                time.sleep(3)
        print('PASS ' + path)

    email, password = os.getenv('SMOKE_EMAIL'), os.getenv('SMOKE_PASSWORD')
    if bool(email) != bool(password):
        raise RuntimeError('Set both SMOKE_EMAIL and SMOKE_PASSWORD, or neither.')
    if not email:
        print('SKIP login: optional smoke credentials not configured')
        return
    cookie = None
    try:
        _, set_cookie = request(base, '/api/auth/login', data={'email': email, 'password': password})
        cookie = session_cookie(set_cookie)
        me, _ = request(base, '/api/auth/me', cookie=cookie)
        if json.loads(me).get('user', {}).get('email') != email.strip().lower():
            raise ValueError('Wrong user')
        print('PASS login and authenticated /api/auth/me')
    except (urllib.error.URLError, TimeoutError, ValueError, KeyError):
        raise RuntimeError('Login smoke check failed') from None
    finally:
        if cookie:
            request(base, '/api/auth/logout', data={}, cookie=cookie, expect_status=204)
            print('PASS logout')


if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit('Usage: python3 deploy/smoke_test.py SERVICE_URL')
    check(sys.argv[1].rstrip('/'))

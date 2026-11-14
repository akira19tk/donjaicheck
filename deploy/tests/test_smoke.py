"""Offline unit tests for deploy/smoke_test.py (the network is mocked).

Run (repo root):  python3 -m unittest discover -s deploy/tests -p 'test_smoke.py'
CI runs it too (.github/workflows/ci-docker.yml).
"""
import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('smoke', Path(__file__).parents[1] / 'smoke_test.py')
smoke = importlib.util.module_from_spec(spec)
spec.loader.exec_module(smoke)

COOKIE = 'dc_session=abc123; Path=/; HttpOnly; SameSite=Lax'


class SmokeTests(unittest.TestCase):
    def response(self, base, path, data=None, cookie=None, expect_status=200):
        bodies = {
            '/api/health': (200, b'{"status":"ok"}', None),
            '/api/ready': (200, b'{"status":"ready","db":"connected"}', None),
            '/': (200, b'<html></html>', None),
            '/api/surveys': (401, b'{"error":"Authentication required","code":"UNAUTHENTICATED"}', None),
            '/api/auth/login': (200, b'{"user":{"email":"smoke@example.test"}}', COOKIE),
            '/api/auth/me': (200, b'{"user":{"email":"smoke@example.test"}}', None),
            '/api/auth/logout': (204, b'', None),
        }
        status, body, set_cookie = bodies[path]
        if status != expect_status:
            raise ValueError(f'{path}: HTTP {status}')
        return body, set_cookie

    @patch.dict('os.environ', {}, clear=True)
    def test_public_checks_pass_and_skip_optional_login(self):
        with patch.object(smoke, 'request', side_effect=self.response) as req:
            smoke.check('https://demo.test')
            self.assertEqual(req.call_count, 4)

    @patch.dict('os.environ', {}, clear=True)
    def test_db_not_ready_fails_even_when_http_responds(self):
        def disconnected(base, path, **kwargs):
            if path == '/api/ready':
                return b'{"db":"unreachable"}', None
            return self.response(base, path, **kwargs)
        with patch.object(smoke, 'request', side_effect=disconnected), patch.object(smoke.time, 'sleep'):
            with self.assertRaisesRegex(RuntimeError, '/api/ready'):
                smoke.check('https://demo.test')

    @patch.dict('os.environ', {}, clear=True)
    def test_protected_api_that_answers_anonymous_users_fails(self):
        def open_api(base, path, **kwargs):
            if path == '/api/surveys':
                raise ValueError('/api/surveys: HTTP 200')
            return self.response(base, path, **kwargs)
        with patch.object(smoke, 'request', side_effect=open_api), patch.object(smoke.time, 'sleep'):
            with self.assertRaisesRegex(RuntimeError, '/api/surveys'):
                smoke.check('https://demo.test')

    @patch.dict('os.environ', {'SMOKE_EMAIL': 'smoke@example.test', 'SMOKE_PASSWORD': 'test-only'}, clear=True)
    def test_login_sends_cookie_and_logs_out(self):
        with patch.object(smoke, 'request', side_effect=self.response) as req:
            smoke.check('https://demo.test')
            me_call = [c for c in req.call_args_list if c.args[1] == '/api/auth/me'][0]
            self.assertEqual(me_call.kwargs['cookie'], 'dc_session=abc123')
            self.assertEqual(req.call_args.args[1], '/api/auth/logout')

    @patch.dict('os.environ', {'SMOKE_EMAIL': 'smoke@example.test', 'SMOKE_PASSWORD': 'test-only'}, clear=True)
    def test_session_is_logged_out_even_if_me_fails(self):
        def broken_me(base, path, **kwargs):
            if path == '/api/auth/me':
                raise ValueError('Broken response')
            return self.response(base, path, **kwargs)
        with patch.object(smoke, 'request', side_effect=broken_me) as req:
            with self.assertRaisesRegex(RuntimeError, 'Login smoke'):
                smoke.check('https://demo.test')
            self.assertEqual(req.call_args.args[1], '/api/auth/logout')


if __name__ == '__main__':
    unittest.main()

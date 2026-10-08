"""Regression tests for reintroducing old secret-containing ancestry."""
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SCANNER = Path(__file__).with_name('check_secrets.py').resolve()

class HistoryProtection(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.repo = Path(self.directory.name)
        self.git('init', '-q', '--initial-branch=main')
        self.git('config', 'user.name', 'Security regression test')
        self.git('config', 'user.email', 'security-test@example.invalid')
        self.key = 'AIza' + 'A' * 35  # Generated dummy value, never a real credential.

    def tearDown(self):
        self.directory.cleanup()

    def git(self, *args):
        return subprocess.run(['git', *args], cwd=self.repo, check=True, capture_output=True)

    def commit(self, value):
        (self.repo / 'config.example').write_text(value)
        self.git('add', 'config.example')
        self.git('commit', '-q', '-m', 'regression fixture')

    def scan(self, history=False):
        return subprocess.run([sys.executable, str(SCANNER), *(['--history'] if history else [])],
                              cwd=self.repo, capture_output=True, text=True)

    def test_clean_history_passes(self):
        self.commit('GEMINI_API_KEY=your_key_here')
        self.assertEqual(self.scan(history=True).returncode, 0)

    def test_current_credential_fails_without_printing_value(self):
        self.commit('GEMINI_API_KEY=' + self.key)
        result = self.scan()
        self.assertEqual(result.returncode, 1)
        self.assertNotIn(self.key, result.stdout)

    def test_deleted_credential_in_ancestry_still_fails(self):
        self.commit('GEMINI_API_KEY=' + self.key)
        self.commit('GEMINI_API_KEY=your_key_here')
        self.assertEqual(self.scan().returncode, 0)
        result = self.scan(history=True)
        self.assertEqual(result.returncode, 1)
        self.assertNotIn(self.key, result.stdout)

if __name__ == '__main__':
    unittest.main()

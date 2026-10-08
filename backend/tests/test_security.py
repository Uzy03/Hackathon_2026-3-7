from types import SimpleNamespace
from unittest.mock import Mock

import pytest
from fastapi.testclient import TestClient
from backend import main
from backend.src import auth
from backend.src.schema import GeminiOutput

USER_ID = '8e35bce9-055d-4ef8-a282-c3d353080ff6'

@pytest.fixture
def client(monkeypatch):
    monkeypatch.setenv('APP_ENABLED', 'true')
    monkeypatch.setenv('SUPABASE_URL', 'https://example.supabase.co')
    monkeypatch.setenv('SUPABASE_ANON_KEY', 'test-publishable')
    monkeypatch.setenv('RAG_ENABLED', 'false')
    auth._conversion_requests.clear()
    def verify(token):
        if token not in ('customer-token', 'admin-token', 'forged-role-token'):
            raise ValueError('Invalid JWT')
        return SimpleNamespace(user=SimpleNamespace(
            id=USER_ID, is_anonymous=False,
            app_metadata={'role': 'admin'} if token == 'admin-token' else {},
            user_metadata={'role': 'admin'} if token == 'forged-role-token' else {},
        ))
    fake_auth = SimpleNamespace(get_user=verify)
    monkeypatch.setattr(auth, 'create_client', lambda *a, **kw: SimpleNamespace(auth=fake_auth))
    db = Mock()
    db.get_or_create_customer_id.return_value = 'owned-customer'
    db.list_messages_by_customer_id.return_value = []
    db.list_customer_stats.return_value = []
    db.list_customers_with_stats.return_value = []
    db.update_customer_display_name.return_value = {'id': 'customer', 'display_name': 'updated', 'created_at': '2026-01-01'}
    monkeypatch.setattr(main, 'database', db)
    return TestClient(main.app), db

@pytest.mark.parametrize('method,path,body', [
    ('GET', '/api/me', None), ('GET', '/api/messages?session_id=victim', None),
    ('GET', '/api/customers', None), ('GET', '/api/stats/customers', None),
    ('GET', '/api/customers/victim/messages', None),
    ('PATCH', '/api/customers/victim', {'displayName': 'changed'}),
    ('POST', '/api/convert', {'message': 'message', 'session_id': 'victim'}),
])
def test_every_api_requires_login(client, method, path, body):
    http, db = client
    assert http.request(method, path, json=body).status_code == 401
    assert not db.mock_calls

@pytest.mark.parametrize('token', ['customer-token', 'forged-role-token'])
@pytest.mark.parametrize('method,path,body', [
    ('GET', '/api/customers', None), ('GET', '/api/stats/customers', None),
    ('GET', '/api/customers/victim/messages', None),
    ('PATCH', '/api/customers/victim', {'displayName': 'changed'}),
])
def test_customer_cannot_access_admin_operations(client, token, method, path, body):
    http, db = client
    assert http.request(method, path, json=body, headers={'Authorization': f'Bearer {token}'}).status_code == 403
    assert not db.mock_calls

def test_disabled_by_default(client, monkeypatch):
    http, db = client
    monkeypatch.delenv('APP_ENABLED')
    assert http.get('/api/customers', headers={'Authorization': 'Bearer admin-token'}).status_code == 503
    assert not db.mock_calls

def test_missing_auth_configuration_is_closed(client, monkeypatch):
    http, db = client
    monkeypatch.delenv('SUPABASE_ANON_KEY')
    assert http.get('/api/me', headers={'Authorization': 'Bearer admin-token'}).status_code == 503
    assert not db.mock_calls

def test_invalid_token_is_rejected(client):
    http, db = client
    assert http.get('/api/me', headers={'Authorization': 'Bearer invalid-token'}).status_code == 401
    assert not db.mock_calls

def test_history_identity_cannot_be_selected_by_query(client):
    http, db = client
    assert http.get('/api/messages?session_id=victim', headers={'Authorization': 'Bearer customer-token'}).status_code == 200
    db.get_or_create_customer_id.assert_called_once_with(USER_ID)
    db.list_messages_by_customer_id.assert_called_once_with(customer_id='owned-customer', limit=200)

def test_verified_admin_can_read_and_update(client):
    http, db = client
    headers = {'Authorization': 'Bearer admin-token'}
    assert http.get('/api/customers', headers=headers).status_code == 200
    assert http.patch('/api/customers/customer', headers=headers, json={'displayName': 'updated'}).status_code == 200
    db.update_customer_display_name.assert_called_once_with(customer_id='customer', display_name='updated')

def test_conversion_uses_authenticated_owner_and_limits_requests(client, monkeypatch):
    http, db = client
    output = GeminiOutput(converted='converted', replySuggestion='reply', aggressionScore=0.1,
                          urgency=1, politeness=3, clarity=3, specificity=3, emotionalStability=3, financialDemand=1)
    engine = Mock()
    engine.convert.return_value = output
    monkeypatch.setattr(main, 'engine', engine)
    for _ in range(12):
        assert http.post('/api/convert', headers={'Authorization': 'Bearer customer-token'},
                         json={'message': 'hello', 'session_id': 'victim'}).status_code == 200
    assert all(call.args == (USER_ID,) for call in db.get_or_create_customer_id.call_args_list)
    assert http.post('/api/convert', headers={'Authorization': 'Bearer customer-token'},
                     json={'message': 'hello'}).status_code == 429
    assert engine.convert.call_count == 12

def test_oversized_input_is_rejected_before_generation(client):
    http, db = client
    assert http.post('/api/convert', headers={'Authorization': 'Bearer customer-token'},
                     json={'message': 'x' * 4001}).status_code == 422
    assert not db.mock_calls

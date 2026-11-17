"""HTTP and template contracts for the Figma-based, live-data frontend."""
from html.parser import HTMLParser
from pathlib import Path
import re

import pytest
from fastapi.testclient import TestClient
from app.main import STATIC_DIR, TEMPLATES_DIR, app

client = TestClient(app)
ROUTES = {
    '/': 'home', '/login/': 'login', '/register/': 'register',
    '/scan/': 'scan', '/scan/result/': 'detection_result', '/recipes/': 'recipes',
    '/recipes/1/': 'recipe_detail', '/recipes/1/guided-cooking/': 'guided_cooking',
    '/history/': 'history', '/favorites/': 'favorites', '/profile/': 'profile',
}

class Nodes(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tags = []
    def handle_starttag(self, tag, attrs):
        self.tags.append((tag, dict(attrs)))


def parse(text):
    nodes = Nodes()
    nodes.feed(text)
    return nodes.tags


@pytest.mark.parametrize(('route', 'page'), ROUTES.items())
def test_routes_and_local_page_assets(route, page):
    response = client.get(route)
    assert response.status_code == 200
    tags = parse(response.text)
    ids = [attrs['id'] for _, attrs in tags if 'id' in attrs]
    assert len(ids) == len(set(ids)), f'duplicate ids on {page}'
    for tag, attrs in tags:
        target = attrs.get('src') or (attrs.get('href') if tag == 'link' else None)
        if target and target.startswith('/static/'):
            assert client.get(target).status_code == 200, target
    assert f'/static/css/pages/{page}.css' in response.text
    assert response.text.count('/static/js/api.js?v=18') == 1


@pytest.mark.parametrize('page', ROUTES.values())
def test_templates_have_no_embedded_scripts_icon_fonts_or_design_download_urls(page):
    text = (TEMPLATES_DIR / f'{page}.html').read_text(encoding='utf-8')
    assert not re.search(r'<style\b', text, re.I)
    tags = parse(text)
    for tag, attrs in tags:
        assert not any(key.startswith('on') for key in attrs)
        if tag == 'script':
            assert attrs.get('src')
    assert 'material-symbols' not in text
    assert 'figma.com/api/mcp/asset/' not in text
    assert 'setCookingSimulatorState' not in text
    assert not re.search(r'^(<<<<<<<|=======|>>>>>>>)', text, re.M)


@pytest.mark.parametrize('page', [p for p in ROUTES.values() if p not in ('login', 'register')])
def test_guest_controls_are_the_first_paint_default(page):
    text = (TEMPLATES_DIR / f'{page}.html').read_text(encoding='utf-8')
    tags = parse(text)
    guest = [attrs for _, attrs in tags if 'data-header-guest' in attrs]
    profile = [attrs for _, attrs in tags if 'data-header-profile' in attrs]
    assert len(guest) == len(profile) == 1
    assert 'hidden' not in guest[0]
    assert 'hidden' in profile[0]
    assert 'Masuk' in text and 'Daftar' in text


def test_auth_forms_are_blank_and_register_does_not_restore_removed_checkboxes():
    for route in ['/login/', '/register/']:
        tags = parse(client.get(route).text)
        for tag, attrs in tags:
            if tag == 'input' and attrs.get('type') in ('email', 'password'):
                assert not attrs.get('value')
    register = parse(client.get('/register/').text)
    assert not any(tag == 'input' and attrs.get('type') == 'checkbox' for tag, attrs in register)
    assert 'rahasiaDapur123' not in client.get('/login/').text


def test_confirmation_form_uses_backend_category_values():
    tags = parse(client.get('/scan/result/').text)
    categories = {attrs['value'] for tag, attrs in tags if tag == 'input' and attrs.get('name') == 'cuisine_type'}
    assert categories == {'Rumahan', 'Tumisan', 'Kuah Hangat'}
    fields = {attrs.get('name') for tag, attrs in tags if tag == 'input'}
    assert {'allergies', 'servings', 'diet', 'detected_ingredients', 'staple_ingredients'} <= fields


def test_recipe_and_collection_pages_wait_for_live_data_instead_of_demo_cards():
    for route in ['/recipes/', '/favorites/', '/history/']:
        response = client.get(route)
        assert '<article' not in response.text
        assert 'Nasi Goreng Rumahan Spesial' not in response.text
    detail = client.get('/recipes/1/').text
    assert 'Total 7 Langkah' not in detail
    assert '98% Cocok' not in detail
    assert '420 Kkal' not in detail


def test_current_shared_assets_are_served():
    for path in ['css/nakena.css', 'css/recipe_images.css', 'js/app_ui.js', 'assets/mascot-chef.png', 'assets/mascot-steps-hd.png', 'assets/recipe-placeholder.svg']:
        response = client.get('/static/' + path)
        assert response.status_code == 200 and response.content

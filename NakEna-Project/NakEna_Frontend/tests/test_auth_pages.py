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
    '/admin-dashboard/': 'admin_dashboard',
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
    assert len(re.findall(r'/static/js/api\.js\?v=\d+', response.text)) == 1
    if page not in ('home', 'login', 'register'):
        assert 'style="visibility:hidden"' in response.text


def test_guided_cooking_loads_shared_styles_for_site_header():
    response = client.get('/recipes/1/guided-cooking/')
    assert '/static/css/nakena.css?v=20' in response.text


def test_recipe_detail_has_one_guided_cooking_cta_in_the_hero():
    response = client.get('/recipes/1/')
    assert response.text.count('href="/recipes/1/guided-cooking/"') == 1
    assert response.text.index('class="guided-cta panel"') < response.text.index('class="detail-grid"')


def test_user_navigation_adds_only_links_missing_from_static_navigation():
    api_js = (STATIC_DIR / 'js' / 'api.js').read_text(encoding='utf-8')
    user_navigation = api_js.split('if (role === "user") {', 1)[1].split('} else if (role === "admin")', 1)[0]
    assert 'addLink("Resep", "/recipes/")' in user_navigation
    assert 'addLink("Preferensi", "/profile/")' in user_navigation
    assert 'addLink("Scan Bahan"' not in user_navigation
    assert 'addLink("Riwayat"' not in user_navigation
    assert 'addLink("Favorit"' not in user_navigation


def test_admin_dashboard_loads_live_analytics_reviews_and_activity_chart():
    api_js = (STATIC_DIR / 'js' / 'api.js').read_text(encoding='utf-8')
    assert 'api("/admin/dashboard")' in api_js
    assert 'admin-activity-chart' in api_js
    assert 'admin-rating-chart' in api_js
    assert 'admin-review-item' in api_js
    assert 'Lihat foto' in api_js
    assert '/admin/uploads/${encodeURIComponent(upload.id)}/image' in api_js
    for view in (
        "overview",
        "detection-monitoring",
        "recipe-monitoring",
        "user-activity",
        "feedback",
        "system-logs",
    ):
        assert f'["{view}",' in api_js


@pytest.mark.parametrize('page', [p for p in ROUTES.values() if p != 'admin_dashboard'])
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


@pytest.mark.parametrize('page', [p for p in ROUTES.values() if p not in ('login', 'register', 'admin_dashboard')])
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
    assert 'difficulty' not in fields
    assert {
        'Vegan', 'Pescatarian', 'Bebas gluten', 'Bebas laktosa',
        'Rendah garam', 'Rendah gula', 'Rendah karbohidrat', 'Rendah lemak',
        'Tinggi protein',
    } <= {attrs['value'] for tag, attrs in tags if tag == 'input' and attrs.get('name') == 'diet'}
    assert {
        'Kacang tanah', 'Kacang pohon', 'Udang', 'Kerang', 'Ikan',
        'Kedelai', 'Gandum', 'Wijen',
    } <= {attrs['value'] for tag, attrs in tags if tag == 'input' and attrs.get('name') == 'allergies'}


def test_recipe_generation_preferences_no_longer_include_difficulty():
    api_js = (STATIC_DIR / 'js' / 'api.js').read_text(encoding='utf-8')
    assert 'Tingkat kesulitan: ${String(values.get("difficulty")' not in api_js


def test_recipe_confirmation_preferences_use_neat_responsive_option_grids():
    css = (STATIC_DIR / 'css' / 'pages' / 'detection_result.css').read_text(encoding='utf-8')
    assert '.preference-field:nth-child(4) .choice-row{grid-template-columns:repeat(3,minmax(0,1fr))}' in css
    assert '.preference-field:nth-child(5) .choice-row{grid-template-columns:repeat(4,minmax(0,1fr))}' in css
    assert '@media(max-width:640px)' in css
    assert '.page-detection_result #ingredientsConfirmationForm .preference-field .choice-chip{width:100%;min-width:0;min-height:40px' in css


def test_scan_camera_manually_captures_photo_for_preview_and_scan():
    tags = parse(client.get('/scan/').text)
    inputs = {attrs.get('id'): attrs for tag, attrs in tags if tag == 'input'}
    assert inputs['cameraInput']['capture'] == 'environment'
    assert inputs['fileInput']['type'] == 'file'
    button_attributes = [attrs for tag, attrs in tags if tag == 'button']
    assert any('data-open-camera' in attrs for attrs in button_attributes)
    assert any('data-open-upload' in attrs for attrs in button_attributes)
    assert any('data-reset-scan' in attrs for attrs in button_attributes)
    assert any(attrs.get('type') == 'submit' for attrs in button_attributes)

    app_ui = (STATIC_DIR / 'js' / 'app_ui.js').read_text(encoding='utf-8')
    assert 'navigator.mediaDevices.getUserMedia' in app_ui
    assert "facingMode: { ideal: 'environment' }" in app_ui
    assert "canvas.toBlob" in app_ui
    assert "setFile(new File([blob]" in app_ui
    assert "camera.accept = 'image/*'" in app_ui


def test_guided_cooking_review_form_saves_and_continues_to_existing_recommendations():
    response = client.get('/recipes/1/guided-cooking/')
    tags = parse(response.text)
    ratings = [
        attrs for tag, attrs in tags
        if tag == 'input' and attrs.get('name') == 'rating'
    ]
    assert [attrs['value'] for attrs in ratings] == ['1', '2', '3', '4', '5']
    assert 'required' in ratings[0]
    assert 'Review hasil masakan' in response.text
    assert 'Simpan review &amp; lihat rekomendasi' in response.text

    guided_js = (STATIC_DIR / 'js' / 'pages' / 'guided_cooking.js').read_text(encoding='utf-8')
    api_js = (STATIC_DIR / 'js' / 'api.js').read_text(encoding='utf-8')
    assert 'nakena:submit-cooking-review' in guided_js
    assert 'nakena:cooking-review-saved' in api_js
    assert 'nakena:cooking-review-error' in api_js
    assert '/recipes/?review=saved#other-recipes' in guided_js
    assert 'id="show-more-recipes-btn"' in response.text
    assert 'Lihat 5 resep lainnya' in response.text
    assert 'location.assign("/recipes/?more=1")' in api_js
    assert 'count: 5' in api_js
    assert 'exclude_titles: Array.isArray(pending.excludeTitles)' in api_js


def test_scan_limits_detected_ingredients_and_empty_results_require_retake():
    app_ui = (STATIC_DIR / 'js' / 'app_ui.js').read_text(encoding='utf-8')
    api_js = (STATIC_DIR / 'js' / 'api.js').read_text(encoding='utf-8')
    assert 'Disarankan scan maksimal 3 jenis bahan agar hasil lebih akurat.' in app_ui
    assert 'confirmManyDetectedIngredients(ingredientTypes.size)' in api_js
    assert 'Bahan terdeteksi lebih dari 3 jenis' in api_js
    assert 'data-retake' in api_js and 'data-continue' in api_js
    assert 'await api(`/uploads/${upload.id}`, { method: "DELETE" })' in api_js
    assert '.slice(0, 3)' not in api_js
    assert 'Foto ini mungkin bukan bahan makanan atau kurang jelas. Silakan foto ulang.' in api_js
    assert 'retake.href = "/scan/"' in api_js
    assert 'form.dataset.scanStatus === "no_detections"' in api_js


def test_recipes_link_is_omitted_from_scan_page_navigation():
    api_js = (STATIC_DIR / 'js' / 'api.js').read_text(encoding='utf-8')
    assert 'if (!["/scan", "/scan/"].includes(location.pathname))' in api_js


def test_cooking_preferences_have_no_saved_difficulty_and_more_diet_allergy_options():
    tags = parse(client.get('/profile/').text)
    diet_options = {
        attrs['value'] for tag, attrs in tags
        if tag == 'input' and attrs.get('name') == 'profile_diet'
    }
    allergy_options = {
        attrs['value'] for tag, attrs in tags
        if tag == 'input' and attrs.get('name') == 'profile_allergies'
    }
    assert not any(
        tag == 'select' and attrs.get('name') == 'default_difficulty'
        for tag, attrs in tags
    )
    assert {'Vegan', 'Bebas gluten', 'Rendah karbohidrat', 'Rendah lemak', 'Pescatarian', 'Bebas laktosa'} <= diet_options
    assert {'Kacang tanah', 'Kacang pohon', 'Udang', 'Kerang', 'Ikan', 'Kedelai', 'Gandum', 'Wijen'} <= allergy_options
    api_js = (STATIC_DIR / 'js' / 'api.js').read_text(encoding='utf-8')
    assert 'default_difficulty: values.get' not in api_js
    assert 'Pilih pola makan dengan total nama maksimal 300 karakter.' in api_js


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
    for path in ['css/nakena.css', 'css/recipe_images.css', 'css/pages/scan.css', 'js/app_ui.js', 'assets/mascot-chef.png', 'assets/mascot-steps-hd.png', 'assets/recipe-placeholder.svg']:
        response = client.get('/static/' + path)
        assert response.status_code == 200 and response.content

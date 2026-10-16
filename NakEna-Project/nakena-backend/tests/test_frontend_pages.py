import pytest


@pytest.mark.parametrize(
    "path",
    [
        "/",
        "/login/",
        "/register/",
        "/scan/",
        "/scan/result/",
        "/recipes/",
        "/recipes/1/",
        "/recipes/1/guided-cooking/",
        "/history/",
        "/favorites/",
        "/profile/",
        "/admin-dashboard/",
    ],
)
def test_frontend_pages_render_from_backend(client, path):
    response = client.get(path)
    assert response.status_code == 200
    assert "/static/frontend.js" in response.text

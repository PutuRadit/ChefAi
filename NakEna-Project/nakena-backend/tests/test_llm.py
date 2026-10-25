from types import SimpleNamespace

from pydantic import SecretStr

from app.services import llm


def test_generate_recipe_uses_fallback_model_after_temporary_unavailability(monkeypatch):
    models_used = []

    class BusyModelError(Exception):
        code = 503

    class FakeModels:
        def generate_content(self, *, model, contents, config):
            models_used.append(model)
            if len(models_used) == 1:
                raise BusyModelError("temporarily unavailable")
            return SimpleNamespace(text='{"recipes":[]}')

    class FakeClient:
        models = FakeModels()

    monkeypatch.setattr(llm.settings, "gemini_api_key", SecretStr("test-key"))
    monkeypatch.setattr(llm.settings, "gemini_model", "custom-primary-model")
    monkeypatch.setattr(llm.genai, "Client", lambda **kwargs: FakeClient())

    result = llm.generate_recipe("Buat resep")

    assert result == '{"recipes":[]}'
    assert models_used == ["custom-primary-model", "gemini-3.1-flash-lite"]


def test_generate_recipe_does_not_fallback_on_quota_error(monkeypatch):
    models_used = []

    class QuotaError(Exception):
        code = 429

    class FakeModels:
        def generate_content(self, *, model, contents, config):
            models_used.append(model)
            raise QuotaError("quota exceeded")

    class FakeClient:
        models = FakeModels()

    monkeypatch.setattr(llm.settings, "gemini_api_key", SecretStr("test-key"))
    monkeypatch.setattr(llm.settings, "gemini_model", "custom-primary-model")
    monkeypatch.setattr(llm.genai, "Client", lambda **kwargs: FakeClient())

    try:
        llm.generate_recipe("Buat resep")
    except QuotaError:
        pass
    else:
        raise AssertionError("Quota errors should be propagated without trying more models.")

    assert models_used == ["custom-primary-model"]

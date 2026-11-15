import json
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base
from app.core.deps import get_current_user, get_db
from app.core.security import get_password_hash
from app.main import app
from app.models.fact import FactItem
from app.models.media import MediaItem
from app.models.quote import QuoteItem
from app.models.theme import ThemeConcept
from app.models.user import User
from app.models.vocab import VocabItem

# Setup in-memory SQLite database
test_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(
    autocommit=False, autoflush=False, bind=test_engine, expire_on_commit=False
)


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def test_user():
    db = TestingSessionLocal()
    user = User(
        email="learner@example.com",
        hashed_password=get_password_hash("password123"),
        display_name="TestLearner",
        first_name="Test",
        last_name="Learner",
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    yield user
    db.close()


@pytest.fixture
def client(test_user):
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = lambda: test_user
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def test_forgot_password_json(client):
    response = client.post("/api/v1/auth/forgot-password", json={"email": "learner@example.com"})
    assert response.status_code == 200
    data = response.json()
    assert "reset link" in data["message"].lower()


def test_media_and_collective_quiz_flow(client, test_user):
    db = TestingSessionLocal()

    # Create media items
    media1 = MediaItem(user_id=test_user.id, title="Inception", type="movie", status="completed")
    media2 = MediaItem(user_id=test_user.id, title="Blade Runner", type="movie", status="completed")
    db.add_all([media1, media2])
    db.commit()
    db.refresh(media1)
    db.refresh(media2)

    # Add themes, vocab, quotes, facts
    t1 = ThemeConcept(media_id=media1.id, title="Dreams within dreams", summary="Layers of subconscious reality.")
    v1 = VocabItem(media_id=media1.id, word="Totem", definition="An object used to test reality.")
    q1 = QuoteItem(media_id=media1.id, text="An idea is like a virus.", speaker="Cobb")
    f1 = FactItem(media_id=media1.id, category="context", content="Directed by Christopher Nolan.")

    t2 = ThemeConcept(media_id=media2.id, title="Humanity and Empathy", summary="What defines human consciousness.")
    v2 = VocabItem(media_id=media2.id, word="Replicant", definition="Bioengineered android.")
    q2 = QuoteItem(media_id=media2.id, text="All those moments will be lost in time.", speaker="Roy Batty")
    f2 = FactItem(media_id=media2.id, category="reference", content="Based on Philip K. Dick novel.")

    db.add_all([t1, v1, q1, f1, t2, v2, q2, f2])
    db.commit()
    db.close()

    # 1. Generate quiz for media1
    res1 = client.get(f"/api/v1/media/{media1.id}/quiz")
    assert res1.status_code == 200
    quiz_data1 = res1.json()
    assert quiz_data1["media_id"] == media1.id
    assert len(quiz_data1["questions"]) > 0

    # 2. Generate collective quiz
    res_collective = client.get("/api/v1/media/collective/quiz")
    assert res_collective.status_code == 200
    collective_quiz = res_collective.json()
    assert collective_quiz["media_id"] == "collective"
    assert len(collective_quiz["questions"]) > 0

    # 3. Submit media quiz
    q = quiz_data1["questions"][0]
    submit_payload = {
        "media_id": media1.id,
        "quiz_type": "mixed",
        "questions": [
            {
                "id": q["id"],
                "type": q["type"],
                "category": q["category"],
                "question": q["question"],
                "options": q["options"],
                "correct_answer": q["correct_answer"],
            }
        ],
        "answers": {q["id"]: q["correct_answer"]},
    }
    submit_res = client.post("/api/v1/quiz/submit", json=submit_payload)
    assert submit_res.status_code == 200
    res_json = submit_res.json()
    assert res_json["score"] == 1
    assert res_json["accuracy"] == 100.0

    # 4. Submit collective quiz with camelCase correctAnswer
    cq = collective_quiz["questions"][0]
    collective_submit_payload = {
        "media_id": "collective",
        "quiz_type": "mixed",
        "questions": [
            {
                "id": cq["id"],
                "type": cq["type"],
                "category": cq["category"],
                "question": cq["question"],
                "options": cq["options"],
                "correctAnswer": cq["correct_answer"],
            }
        ],
        "answers": {cq["id"]: cq["correct_answer"]},
    }
    col_submit_res = client.post("/api/v1/quiz/submit", json=collective_submit_payload)
    assert col_submit_res.status_code == 200
    col_res_json = col_submit_res.json()
    assert col_res_json["score"] == 1
    assert col_res_json["accuracy"] == 100.0

    # 5. Check quiz stats
    stats_res = client.get("/api/v1/quiz/stats")
    assert stats_res.status_code == 200
    stats = stats_res.json()
    assert stats["total_quizzes"] == 2
    assert stats["average_accuracy"] == 100.0
    assert stats["best_media"]["media_id"] == media1.id

    # 6. Check quiz history
    hist_res = client.get("/api/v1/quiz/history")
    assert hist_res.status_code == 200
    hist = hist_res.json()
    assert hist["total"] == 2

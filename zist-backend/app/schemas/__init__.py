from app.schemas.auth import (
    SignupRequest,
    LoginRequest,
    TokenResponse,
    AuthUserResponse,
    AuthResponse,
)
from app.schemas.user import (
    UserBase,
    UserPublic,
    UserUpdate,
    FollowResponse,
    UserListResponse,
)
from app.schemas.media import (
    MediaBase,
    MediaCreate,
    MediaUpdate,
    MediaResponse,
    MediaListResponse,
)
from app.schemas.theme import (
    ThemeBase,
    ThemeCreate,
    ThemeUpdate,
    ThemeResponse,
    ThemeListResponse,
)
from app.schemas.fact import (
    FactBase,
    FactCreate,
    FactUpdate,
    FactResponse,
    FactListResponse,
)
from app.schemas.vocab import (
    VocabBase,
    VocabCreate,
    VocabUpdate,
    VocabResponse,
    VocabListResponse,
)
from app.schemas.quote import (
    QuoteBase,
    QuoteCreate,
    QuoteUpdate,
    QuoteResponse,
    QuoteListResponse,
)
from app.schemas.feed import (
    FeedPostCreate,
    FeedPostResponse,
    FeedListResponse,
    FeedToggleResponse,
)
from app.schemas.quiz import (
    QuizQuestion,
    QuizGenerateResponse,
    QuizSubmitRequest,
    QuizSubmitResponse,
    QuizAttemptResponse,
    QuizHistoryResponse,
    QuizStatsResponse,
)
from app.schemas.common import MessageResponse, PaginatedResponse
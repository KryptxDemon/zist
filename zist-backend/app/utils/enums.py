from enum import Enum


class MediaType(str, Enum):
    movie = "movie"
    tv = "tv"
    book = "book"
    documentary = "documentary"
    podcast = "podcast"
    game = "game"


class MediaStatus(str, Enum):
    planned = "planned"
    in_progress = "in-progress"
    completed = "completed"


class FactCategory(str, Enum):
    misconception = "misconception"
    reference = "reference"
    context = "context"


class FeedVisibility(str, Enum):
    friends = "friends"
    global_ = "global"


class FeedFilterVisibility(str, Enum):
    all = "all"
    friends = "friends"
    global_ = "global"


class FeedPostType(str, Enum):
    theme = "theme"
    vocab = "vocab"
    quote = "quote"


class QuizType(str, Enum):
    theme = "theme"
    vocab = "vocab"
    quote = "quote"
    fact = "fact"
    mixed = "mixed"

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { mediaService, themeService, vocabService, quoteService } from '@/services/mediaService';
import { MediaItem, QuizQuestion, ThemeConcept, VocabItem, QuoteItem } from '@/types';
import { ArrowLeft, ArrowRight, Check, X, Trophy, RefreshCw, Brain } from 'lucide-react';
import { cn } from '@/lib/utils';

function generateQuestions(themes: ThemeConcept[], vocab: VocabItem[], quotes: QuoteItem[]): QuizQuestion[] {
  const questions: QuizQuestion[] = [];

  // Theme questions
  themes.slice(0, 3).forEach((theme, index) => {
    if (theme.summary) {
      questions.push({
        id: `theme-${index}`,
        type: 'multiple-choice',
        question: `What is the main concept behind "${theme.title}"?`,
        options: [
          theme.summary.substring(0, 100) + '...',
          'A technique for digital art creation',
          'A cooking method from ancient cultures',
          'A mathematical theorem',
        ].sort(() => Math.random() - 0.5),
        correctAnswer: theme.summary.substring(0, 100) + '...',
        category: 'theme',
      });
    }
  });

  // Vocabulary questions
  vocab.slice(0, 4).forEach((word, index) => {
    if (word.definition) {
      questions.push({
        id: `vocab-${index}`,
        type: 'multiple-choice',
        question: `What is the definition of "${word.word}"?`,
        options: [
          word.definition,
          'A type of ancient currency',
          'A method of preserving food',
          'A style of architecture',
        ].sort(() => Math.random() - 0.5),
        correctAnswer: word.definition,
        category: 'vocab',
      });
    }
  });

  // Quote questions
  quotes.slice(0, 3).forEach((quote, index) => {
    questions.push({
      id: `quote-${index}`,
      type: 'short-answer',
      question: `Who said: "${quote.text.substring(0, 80)}..."?`,
      correctAnswer: quote.speaker || 'Unknown',
      category: 'quote',
    });
  });

  return questions.slice(0, 10);
}

export default function QuizSession() {
  const { mediaId } = useParams<{ mediaId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [media, setMedia] = useState<MediaItem | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showResults, setShowResults] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadQuiz() {
      if (!mediaId) return;
      setIsLoading(true);
      try {
        const [mediaData, themes, vocab, quotes] = await Promise.all([
          mediaService.getById(mediaId),
          themeService.getByMediaId(mediaId),
          vocabService.getByMediaId(mediaId),
          quoteService.getByMediaId(mediaId),
        ]);

        if (!mediaData) {
          navigate('/app/quiz');
          return;
        }

        setMedia(mediaData);
        const generatedQuestions = generateQuestions(themes, vocab, quotes);
        
        if (generatedQuestions.length === 0) {
          toast({
            title: 'Not enough content',
            description: 'Add more themes, vocabulary, or quotes to generate a quiz.',
            variant: 'destructive',
          });
          navigate('/app/quiz');
          return;
        }

        setQuestions(generatedQuestions);
      } catch (error) {
        console.error('Failed to load quiz:', error);
        toast({ title: 'Failed to load quiz', variant: 'destructive' });
      } finally {
        setIsLoading(false);
      }
    }

    loadQuiz();
  }, [mediaId, navigate, toast]);

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  const handleAnswer = (answer: string) => {
    setAnswers({ ...answers, [currentQuestion.id]: answer });
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setShowResults(true);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const calculateScore = () => {
    let correct = 0;
    questions.forEach((q) => {
      const userAnswer = answers[q.id]?.toLowerCase().trim();
      const correctAnswer = q.correctAnswer.toLowerCase().trim();
      if (userAnswer === correctAnswer || (q.type === 'short-answer' && userAnswer?.includes(correctAnswer.split(' ')[0]))) {
        correct++;
      }
    });
    return correct;
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setAnswers({});
    setShowResults(false);
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Brain className="h-12 w-12 text-primary animate-pulse mx-auto mb-4" />
            <p className="text-muted-foreground">Generating quiz...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (showResults) {
    const score = calculateScore();
    const percentage = Math.round((score / questions.length) * 100);

    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto animate-fade-in pb-20 md:pb-0">
          <div className="glass grain rounded-2xl p-8 text-center">
            <div className={cn(
              'w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6',
              percentage >= 80 ? 'bg-emerald-500/20' : percentage >= 60 ? 'bg-amber-500/20' : 'bg-destructive/20'
            )}>
              <Trophy className={cn(
                'h-12 w-12',
                percentage >= 80 ? 'text-emerald-400' : percentage >= 60 ? 'text-amber-400' : 'text-destructive'
              )} />
            </div>

            <h1 className="font-display text-3xl font-bold text-foreground mb-2">Quiz Complete!</h1>
            <p className="text-muted-foreground mb-6">{media?.title}</p>

            <div className="text-5xl font-display font-bold text-foreground mb-2">
              {score}/{questions.length}
            </div>
            <p className="text-lg text-muted-foreground mb-8">{percentage}% Accuracy</p>

            {/* Results breakdown */}
            <div className="space-y-3 mb-8 text-left">
              {questions.map((q, i) => {
                const userAnswer = answers[q.id];
                const isCorrect = userAnswer?.toLowerCase().trim() === q.correctAnswer.toLowerCase().trim();
                return (
                  <div key={q.id} className={cn(
                    'p-4 rounded-xl',
                    isCorrect ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-destructive/10 border border-destructive/20'
                  )}>
                    <div className="flex items-start gap-3">
                      {isCorrect ? (
                        <Check className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <X className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p className="text-sm text-foreground font-medium">{q.question}</p>
                        {!isCorrect && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Correct: <span className="text-foreground">{q.correctAnswer}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => navigate('/app/quiz')} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Quiz Hub
              </Button>
              <Button onClick={handleRestart} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Retry Quiz
              </Button>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto animate-fade-in pb-20 md:pb-0">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/app/quiz')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-display text-xl font-bold text-foreground">{media?.title} Quiz</h1>
            <p className="text-sm text-muted-foreground">Question {currentIndex + 1} of {questions.length}</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-2 bg-muted rounded-full overflow-hidden mb-8">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Question Card */}
        <div className="glass grain rounded-2xl p-6 sm:p-8 mb-6">
          <span className={cn(
            'inline-block px-3 py-1 rounded-full text-xs font-medium mb-4',
            currentQuestion.category === 'theme' && 'bg-amber-500/20 text-amber-400',
            currentQuestion.category === 'vocab' && 'bg-emerald-500/20 text-emerald-400',
            currentQuestion.category === 'quote' && 'bg-violet-500/20 text-violet-400',
            currentQuestion.category === 'fact' && 'bg-sky-500/20 text-sky-400'
          )}>
            {currentQuestion.category.charAt(0).toUpperCase() + currentQuestion.category.slice(1)}
          </span>

          <h2 className="font-display text-xl font-semibold text-foreground mb-6">
            {currentQuestion.question}
          </h2>

          {currentQuestion.type === 'multiple-choice' ? (
            <div className="space-y-3">
              {currentQuestion.options?.map((option, i) => (
                <button
                  key={i}
                  onClick={() => handleAnswer(option)}
                  className={cn(
                    'w-full p-4 rounded-xl text-left transition-smooth border',
                    answers[currentQuestion.id] === option
                      ? 'bg-primary/20 border-primary text-foreground'
                      : 'bg-accent/30 border-transparent hover:bg-accent hover:border-border text-muted-foreground'
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
          ) : (
            <Input
              placeholder="Type your answer..."
              value={answers[currentQuestion.id] || ''}
              onChange={(e) => handleAnswer(e.target.value)}
              className="h-12"
            />
          )}
        </div>

        {/* Navigation */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Previous
          </Button>
          <Button
            onClick={handleNext}
            disabled={!answers[currentQuestion.id]}
            className="flex-1 gap-2"
          >
            {currentIndex === questions.length - 1 ? 'Finish Quiz' : 'Next'}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}

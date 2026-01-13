const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Mock Wikipedia/summary service
export const wikiService = {
  async getSummaryByTopic(topic: string): Promise<{ summary: string; sourceUrl: string }> {
    await delay(1200);

    const summaries: Record<string, string> = {
      mormonism:
        'The Church of Jesus Christ of Latter-day Saints, often referred to as Mormonism, is a nontrinitarian, Christian restorationist church founded by Joseph Smith in 1830. It is headquartered in Salt Lake City, Utah, and has over 17 million members worldwide.',
      faith:
        'Faith is complete trust or confidence in someone or something. In religious contexts, it refers to belief in God or in the doctrines or teachings of religion.',
      extremism:
        'Extremism refers to the holding of extreme political or religious views, or the taking of extreme actions on the basis of those views.',
      isolation:
        'Social isolation is a state of complete or near-complete lack of contact between an individual and society. It differs from loneliness, which reflects temporary and involuntary lack of contact with other humans.',
    };

    const lowerTopic = topic.toLowerCase();
    const matchedKey = Object.keys(summaries).find((key) => lowerTopic.includes(key));

    return {
      summary:
        matchedKey !== undefined
          ? summaries[matchedKey]
          : `${topic} is a concept that explores fundamental aspects of human experience and understanding. This topic has been discussed extensively in literature, philosophy, and various media.`,
      sourceUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(topic)}`,
    };
  },

  async suggestThemes(mediaTitle: string): Promise<string[]> {
    await delay(800);
    
    // Mock theme suggestions based on common patterns
    const suggestions = [
      'Faith and Doubt',
      'Religious Extremism',
      'Isolation and Community',
      'Truth vs Deception',
      'Family Dynamics',
      'Moral Ambiguity',
      'Power and Control',
      'Identity and Belonging',
    ];

    return suggestions.slice(0, 5);
  },
};

// Mock dictionary service
export const dictionaryService = {
  async getDefinitionAndExample(word: string): Promise<{ definition: string; example: string }> {
    await delay(800);

    const dictionary: Record<string, { definition: string; example: string }> = {
      apostate: {
        definition: 'A person who renounces a religious or political belief or principle.',
        example: 'He was labeled an apostate after leaving the church.',
      },
      proselytize: {
        definition: 'To convert or attempt to convert someone from one religion or belief to another.',
        example: 'Missionaries often proselytize in developing countries.',
      },
      dogma: {
        definition: 'A principle or set of principles laid down by an authority as incontrovertibly true.',
        example: 'The dogma of the church has remained unchanged for centuries.',
      },
      heretic: {
        definition: 'A person believing in or practicing religious heresy, or holding an opinion at odds with what is generally accepted.',
        example: 'The scientist was considered a heretic for his revolutionary theories.',
      },
    };

    const lowerWord = word.toLowerCase();
    if (dictionary[lowerWord]) {
      return dictionary[lowerWord];
    }

    return {
      definition: `The meaning of "${word}" encompasses various interpretations depending on context.`,
      example: `The term "${word}" was used frequently throughout the narrative.`,
    };
  },
};

// Mock AI service for quote meanings
export const aiService = {
  async generateQuoteMeaning(quote: string, context?: string): Promise<string> {
    await delay(1500);

    const meanings = [
      'This quote suggests a deep exploration of human nature and the complexities of belief systems. It highlights the tension between individual conscience and institutional authority.',
      'The statement reflects on the nature of truth and how it can be perceived differently based on one\'s perspective and conditioning.',
      'This passage explores the theme of doubt as a necessary component of genuine faith, suggesting that unexamined belief lacks authenticity.',
      'The quote examines the psychological dynamics of manipulation and the vulnerability of those seeking meaning or belonging.',
    ];

    return meanings[Math.floor(Math.random() * meanings.length)];
  },
};

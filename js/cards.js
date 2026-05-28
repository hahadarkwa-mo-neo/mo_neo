/**
 * cards.js - Card definitions, deck management
 * Mèo Nổ (Exploding Kittens) Browser Game
 */

const CardType = {
  EXPLODING_KITTEN: 'exploding_kitten',
  DEFUSE: 'defuse',
  SKIP: 'skip',
  ATTACK: 'attack',
  SEE_FUTURE: 'see_future',
  SHUFFLE: 'shuffle',
  NOPE: 'nope',
  FAVOR: 'favor',
  CAT_TACO: 'cat_taco',
  CAT_MELON: 'cat_melon',
  CAT_BEARD: 'cat_beard',
  CAT_RAINBOW: 'cat_rainbow'
};

const CAT_TYPES = [
  CardType.CAT_TACO,
  CardType.CAT_MELON,
  CardType.CAT_BEARD,
  CardType.CAT_RAINBOW
];

const CARD_INFO = {
  [CardType.EXPLODING_KITTEN]: {
    name: 'Mèo Nổ',
    emoji: '💣',
    description: 'BÙM! Bạn bị loại nếu không có Tháo Ngòi!',
    color: '#ff2e63',
    gradient: ['#ff2e63', '#ff6b35'],
    bgPattern: '🔥',
    count: 0 // special: added as numPlayers - 1
  },
  [CardType.DEFUSE]: {
    name: 'Tháo Ngòi',
    emoji: '🔧',
    description: 'Cứu bạn khỏi Mèo Nổ. Đặt lại Mèo Nổ vào bộ bài.',
    color: '#00ff88',
    gradient: ['#00ff88', '#00d4ff'],
    bgPattern: '✨',
    count: 6
  },
  [CardType.SKIP]: {
    name: 'Bỏ Lượt',
    emoji: '⏭️',
    description: 'Kết thúc lượt mà không cần bốc bài.',
    color: '#00d4ff',
    gradient: ['#00d4ff', '#7c3aed'],
    bgPattern: '💨',
    count: 4
  },
  [CardType.ATTACK]: {
    name: 'Tấn Công',
    emoji: '⚔️',
    description: 'Kết thúc lượt. Người tiếp theo phải chơi 2 lượt!',
    color: '#ff6b35',
    gradient: ['#ff6b35', '#ff2e63'],
    bgPattern: '⚡',
    count: 4
  },
  [CardType.SEE_FUTURE]: {
    name: 'Nhìn Trộm',
    emoji: '🔮',
    description: 'Xem 3 lá bài trên cùng của bộ bài.',
    color: '#7c3aed',
    gradient: ['#7c3aed', '#c084fc'],
    bgPattern: '👁️',
    count: 5
  },
  [CardType.SHUFFLE]: {
    name: 'Xáo Bài',
    emoji: '🔀',
    description: 'Xáo trộn ngẫu nhiên bộ bài.',
    color: '#f59e0b',
    gradient: ['#f59e0b', '#fbbf24'],
    bgPattern: '🌀',
    count: 4
  },
  [CardType.NOPE]: {
    name: 'Phản Đối',
    emoji: '🚫',
    description: 'Hủy bỏ hành động của lá bài vừa đánh.',
    color: '#ef4444',
    gradient: ['#ef4444', '#991b1b'],
    bgPattern: '✋',
    count: 5
  },
  [CardType.FAVOR]: {
    name: 'Xin Bài',
    emoji: '🎁',
    description: 'Buộc 1 người chơi khác cho bạn 1 lá bài.',
    color: '#ec4899',
    gradient: ['#ec4899', '#be185d'],
    bgPattern: '💝',
    count: 4
  },
  [CardType.CAT_TACO]: {
    name: 'Mèo Taco',
    emoji: '🌮',
    description: 'Đánh 2 lá giống nhau để ăn cắp 1 lá bài ngẫu nhiên.',
    color: '#f97316',
    gradient: ['#f97316', '#ea580c'],
    bgPattern: '🐱',
    count: 4
  },
  [CardType.CAT_MELON]: {
    name: 'Mèo Dưa Hấu',
    emoji: '🍉',
    description: 'Đánh 2 lá giống nhau để ăn cắp 1 lá bài ngẫu nhiên.',
    color: '#22c55e',
    gradient: ['#22c55e', '#15803d'],
    bgPattern: '🐱',
    count: 4
  },
  [CardType.CAT_BEARD]: {
    name: 'Mèo Râu',
    emoji: '🧔',
    description: 'Đánh 2 lá giống nhau để ăn cắp 1 lá bài ngẫu nhiên.',
    color: '#a16207',
    gradient: ['#92400e', '#78350f'],
    bgPattern: '🐱',
    count: 4
  },
  [CardType.CAT_RAINBOW]: {
    name: 'Mèo Cầu Vồng',
    emoji: '🌈',
    description: 'Đánh 2 lá giống nhau để ăn cắp 1 lá bài ngẫu nhiên.',
    color: '#8b5cf6',
    gradient: ['#8b5cf6', '#6d28d9'],
    bgPattern: '🐱',
    count: 4
  }
};

// ============ Utility Functions ============

let _nextCardId = 1;

function isCatCard(type) {
  return CAT_TYPES.includes(type);
}

function getCardInfo(type) {
  return CARD_INFO[type];
}

function createCard(type) {
  const info = CARD_INFO[type];
  return {
    id: _nextCardId++,
    type,
    name: info.name,
    emoji: info.emoji,
    description: info.description,
    color: info.color,
    gradient: [...info.gradient],
    bgPattern: info.bgPattern
  };
}

/**
 * Creates a full deck for the game (without Exploding Kittens and without
 * the Defuse cards that are dealt to players initially).
 */
function createDeck(numPlayers) {
  const deck = [];

  for (const [type, info] of Object.entries(CARD_INFO)) {
    // Skip Exploding Kittens - added after dealing
    if (type === CardType.EXPLODING_KITTEN) continue;
    // Skip Defuse - handled separately
    if (type === CardType.DEFUSE) continue;

    for (let i = 0; i < info.count; i++) {
      deck.push(createCard(type));
    }
  }

  return deck;
}

/**
 * Fisher-Yates shuffle - in place
 */
function shuffleDeck(deck) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

/**
 * Deal cards to players.
 * Each player gets 1 Defuse + 7 random cards from deck.
 * Remaining Defuse cards and Exploding Kittens are added to deck.
 * Returns array of hands.
 */
function dealCards(deck, numPlayers) {
  // Shuffle before dealing
  shuffleDeck(deck);

  const hands = [];

  for (let p = 0; p < numPlayers; p++) {
    const hand = [];
    // Give 1 Defuse card to each player
    hand.push(createCard(CardType.DEFUSE));
    // Deal 7 cards from the deck
    for (let i = 0; i < 7; i++) {
      if (deck.length > 0) {
        hand.push(deck.pop());
      }
    }
    hands.push(hand);
  }

  // Add remaining Defuse cards to deck
  const remainingDefuse = Math.max(0, 6 - numPlayers);
  for (let i = 0; i < remainingDefuse; i++) {
    deck.push(createCard(CardType.DEFUSE));
  }

  // Add Exploding Kittens (numPlayers - 1)
  for (let i = 0; i < numPlayers - 1; i++) {
    deck.push(createCard(CardType.EXPLODING_KITTEN));
  }

  // Shuffle deck again (with EK and extra Defuse now in it)
  shuffleDeck(deck);

  return hands;
}

/**
 * Count cards of a specific type in a hand
 */
function countCardType(hand, type) {
  return hand.filter(c => c.type === type).length;
}

/**
 * Find pairs of cat cards in a hand
 */
function findCatPairs(hand) {
  const pairs = [];
  const catCounts = {};

  for (const card of hand) {
    if (isCatCard(card.type)) {
      if (!catCounts[card.type]) catCounts[card.type] = [];
      catCounts[card.type].push(card);
    }
  }

  for (const [type, cards] of Object.entries(catCounts)) {
    if (cards.length >= 2) {
      pairs.push({ type, cards: [cards[0], cards[1]] });
    }
  }

  return pairs;
}

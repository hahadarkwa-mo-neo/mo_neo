/**
 * player.js - Player class and AI decision engine
 * Mèo Nổ (Exploding Kittens) Browser Game
 */

const PLAYER_AVATARS = ['😺', '😸', '😹', '😻', '😼'];
const PLAYER_NAMES = ['Bạn', 'Bot Miu', 'Bot Meow', 'Bot Nyaa', 'Bot Neko'];
const PLAYER_COLORS = ['#00d4ff', '#ff6b35', '#00ff88', '#c084fc', '#fbbf24'];

class Player {
  constructor(index, isHuman = false) {
    this.index = index;
    this.name = PLAYER_NAMES[index];
    this.avatar = PLAYER_AVATARS[index];
    this.color = PLAYER_COLORS[index];
    this.hand = [];
    this.isHuman = isHuman;
    this.isAlive = true;
    this.turnsToPlay = 1;
  }

  hasCardType(type) {
    return this.hand.some(c => c.type === type);
  }

  countCardType(type) {
    return this.hand.filter(c => c.type === type).length;
  }

  getCardOfType(type) {
    return this.hand.find(c => c.type === type);
  }

  getCardsOfType(type) {
    return this.hand.filter(c => c.type === type);
  }

  removeCard(cardId) {
    const idx = this.hand.findIndex(c => c.id === cardId);
    if (idx !== -1) {
      return this.hand.splice(idx, 1)[0];
    }
    return null;
  }

  removeCardByType(type) {
    const idx = this.hand.findIndex(c => c.type === type);
    if (idx !== -1) {
      return this.hand.splice(idx, 1)[0];
    }
    return null;
  }

  addCard(card) {
    this.hand.push(card);
  }

  get cardCount() {
    return this.hand.length;
  }

  get cardCountDisplay() {
    return this.cardCount;
  }
}

// ============ AI Decision Engine ============

const AI = {
  /**
   * Decide what the AI should do on its turn.
   * Returns an action object:
   * { type: 'play', card: Card, target?: Player }
   * { type: 'play_pair', cards: [Card, Card], target: Player }
   * { type: 'draw' }
   */
  decideTurn(player, gameState) {
    const { deck, players, discardPile } = gameState;
    const alive = players.filter(p => p.isAlive && p.index !== player.index);
    const deckSize = deck.length;

    // Calculate danger level (how likely to draw Exploding Kitten)
    const ekInDeck = deck.filter(c => c.type === CardType.EXPLODING_KITTEN).length;
    const dangerLevel = deckSize > 0 ? ekInDeck / deckSize : 0;
    const hasDefuse = player.hasCardType(CardType.DEFUSE);
    const isHighDanger = dangerLevel > 0.3;
    const isCriticalDanger = dangerLevel > 0.5;

    // If we saw the future and know the top card...
    if (gameState.knownTopCards && gameState.knownTopCards.length > 0 &&
        gameState.knownTopCardsPlayer === player.index) {
      const topCard = gameState.knownTopCards[0];
      if (topCard.type === CardType.EXPLODING_KITTEN) {
        // Top card is Exploding Kitten! Must avoid drawing.

        // Priority 1: Play Skip
        if (player.hasCardType(CardType.SKIP)) {
          const card = player.getCardOfType(CardType.SKIP);
          return { type: 'play', card };
        }

        // Priority 2: Play Attack
        if (player.hasCardType(CardType.ATTACK)) {
          const card = player.getCardOfType(CardType.ATTACK);
          return { type: 'play', card };
        }

        // Priority 3: Shuffle the deck
        if (player.hasCardType(CardType.SHUFFLE)) {
          const card = player.getCardOfType(CardType.SHUFFLE);
          return { type: 'play', card };
        }
      }
    }

    // Strategy based on danger level
    if (isCriticalDanger && !hasDefuse) {
      // CRITICAL: No defuse and high danger - try everything to avoid drawing

      // Play Skip
      if (player.hasCardType(CardType.SKIP)) {
        return { type: 'play', card: player.getCardOfType(CardType.SKIP) };
      }

      // Play Attack
      if (player.hasCardType(CardType.ATTACK)) {
        return { type: 'play', card: player.getCardOfType(CardType.ATTACK) };
      }

      // Shuffle
      if (player.hasCardType(CardType.SHUFFLE)) {
        return { type: 'play', card: player.getCardOfType(CardType.SHUFFLE) };
      }

      // See Future to check
      if (player.hasCardType(CardType.SEE_FUTURE)) {
        return { type: 'play', card: player.getCardOfType(CardType.SEE_FUTURE) };
      }
    }

    if (isHighDanger) {
      // HIGH DANGER - consider using action cards

      // See Future if we don't know what's on top
      if (player.hasCardType(CardType.SEE_FUTURE) &&
          (!gameState.knownTopCards || gameState.knownTopCardsPlayer !== player.index)) {
        if (Math.random() < 0.7) {
          return { type: 'play', card: player.getCardOfType(CardType.SEE_FUTURE) };
        }
      }

      // Skip if danger is high and we want to be safe
      if (player.hasCardType(CardType.SKIP) && Math.random() < dangerLevel) {
        return { type: 'play', card: player.getCardOfType(CardType.SKIP) };
      }

      // Attack to put pressure on others
      if (player.hasCardType(CardType.ATTACK) && Math.random() < dangerLevel * 0.8) {
        return { type: 'play', card: player.getCardOfType(CardType.ATTACK) };
      }

      // Shuffle if danger is critical
      if (player.hasCardType(CardType.SHUFFLE) && Math.random() < dangerLevel * 0.6) {
        return { type: 'play', card: player.getCardOfType(CardType.SHUFFLE) };
      }
    }

    // Medium/Low danger - opportunistic plays

    // Play cat pairs to steal from opponents
    const pairs = findCatPairs(player.hand);
    if (pairs.length > 0 && alive.length > 0) {
      const bestTarget = this.chooseBestTarget(alive, gameState);
      if (bestTarget && Math.random() < 0.4) {
        const pair = pairs[0];
        return {
          type: 'play_pair',
          cards: pair.cards,
          target: bestTarget
        };
      }
    }

    // Play Favor to get cards from opponents
    if (player.hasCardType(CardType.FAVOR) && alive.length > 0 && Math.random() < 0.3) {
      const target = this.chooseBestTarget(alive, gameState);
      if (target) {
        return {
          type: 'play',
          card: player.getCardOfType(CardType.FAVOR),
          target
        };
      }
    }

    // Default: just draw a card
    return { type: 'draw' };
  },

  /**
   * Choose the best target player for stealing/favor.
   * Prefers players with more cards.
   */
  chooseBestTarget(alivePlayers, gameState) {
    if (alivePlayers.length === 0) return null;

    // Target the player with the most cards
    return alivePlayers.reduce((best, p) =>
      p.cardCount > best.cardCount ? p : best
    , alivePlayers[0]);
  },

  /**
   * Decide whether to play a Nope card.
   * Returns true if AI decides to Nope.
   */
  shouldNope(player, playedCard, playedBy, targetPlayer, gameState) {
    if (!player.hasCardType(CardType.NOPE)) return false;
    if (!player.isAlive) return false;

    const nopeCount = player.countCardType(CardType.NOPE);

    // Always Nope an Attack targeting us
    if (playedCard.type === CardType.ATTACK) {
      const nextAliveIndex = gameState.getNextAlivePlayer(playedBy.index);
      if (nextAliveIndex === player.index) {
        return Math.random() < 0.85;
      }
    }

    // Always Nope a Favor targeting us
    if (playedCard.type === CardType.FAVOR && targetPlayer &&
        targetPlayer.index === player.index) {
      return Math.random() < 0.8;
    }

    // Sometimes Nope cat pair steals targeting us
    if (playedCard.type === 'cat_pair' && targetPlayer &&
        targetPlayer.index === player.index) {
      return Math.random() < 0.6;
    }

    // Occasionally Nope other players' helpful cards
    if (playedCard.type === CardType.SKIP && nopeCount > 1) {
      return Math.random() < 0.15;
    }

    if (playedCard.type === CardType.SEE_FUTURE) {
      return Math.random() < 0.1;
    }

    if (playedCard.type === CardType.SHUFFLE) {
      // Nope shuffle if we know the top cards are safe
      if (gameState.knownTopCards && gameState.knownTopCardsPlayer === player.index) {
        const topSafe = gameState.knownTopCards[0]?.type !== CardType.EXPLODING_KITTEN;
        if (topSafe) return Math.random() < 0.5;
      }
      return Math.random() < 0.1;
    }

    return false;
  },

  /**
   * When asked to give a card via Favor, choose which card to give.
   * Strategy: Give the least useful card, never give Defuse.
   */
  chooseCardToGive(player) {
    // Priority: give cat cards (singles, not pairs) > Nope > action cards
    // NEVER give Defuse

    const hand = player.hand.filter(c => c.type !== CardType.DEFUSE);
    if (hand.length === 0) {
      // Only has Defuse cards... must give one
      return player.hand[0];
    }

    // Give single cat cards first (ones without pairs)
    const catCounts = {};
    for (const card of hand) {
      if (isCatCard(card.type)) {
        catCounts[card.type] = (catCounts[card.type] || 0) + 1;
      }
    }

    for (const card of hand) {
      if (isCatCard(card.type) && catCounts[card.type] === 1) {
        return card; // single cat card, least useful
      }
    }

    // Give Shuffle (least impactful action)
    const shuffle = hand.find(c => c.type === CardType.SHUFFLE);
    if (shuffle) return shuffle;

    // Give See Future
    const seeFuture = hand.find(c => c.type === CardType.SEE_FUTURE);
    if (seeFuture) return seeFuture;

    // Give Favor
    const favor = hand.find(c => c.type === CardType.FAVOR);
    if (favor) return favor;

    // Give any remaining card (not Defuse)
    return hand[Math.floor(Math.random() * hand.length)];
  },

  /**
   * Choose where to place the Exploding Kitten back in the deck.
   * Strategy: Place it near the top to hit the next player.
   */
  chooseEKPlacement(deckSize, gameState, player) {
    // Place it near the top (0-2) to hit the next player
    if (deckSize <= 1) return 0;

    // 60% chance near top (bad for next player)
    if (Math.random() < 0.6) {
      return Math.min(Math.floor(Math.random() * 3), deckSize);
    }

    // 30% random
    if (Math.random() < 0.75) {
      return Math.floor(Math.random() * deckSize);
    }

    // 10% near bottom (safe spot)
    return Math.max(0, deckSize - Math.floor(Math.random() * 3));
  }
};

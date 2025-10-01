enum Owner {
  Blue = "blue",
  Red = "red",
  Yellow = "yellow",
  Neutral = "neutral",
}

const COLORS: Record<Owner, number> = {
  [Owner.Blue]: 0x3b82f6,
  [Owner.Red]: 0xef4444,
  [Owner.Yellow]: 0xf59e0b,
  [Owner.Neutral]: 0x94a3b8,
};

enum ZIndex {
  Background = 0,
  Paths = 10, // gray "dots" of direction
  Soldiers = 20, // soldiers (should be under the towers)
  Towers = 30, // towers over soldiers
  UI = 100,
}

const ownerColor = (owner: Owner) => COLORS[owner];

const isEnemy = (owner: Owner): boolean => {
  return owner !== Owner.Blue;
};

const isPlayer = (owner: Owner): boolean => {
  return owner === Owner.Blue;
};

// Ворог лише з точки зору гравця (синього)
const isEnemyForPlayer = (o: Owner) => o !== Owner.Blue && o !== Owner.Neutral;

// Чи є ціль суперником для конкретного власника (AI теж користується)
const isOpponentFor = (attacker: Owner, defender: Owner) => attacker !== defender;

export { Owner, ZIndex, ownerColor, isEnemy, isPlayer, isEnemyForPlayer, isOpponentFor };

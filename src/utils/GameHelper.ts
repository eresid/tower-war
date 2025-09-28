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

const ownerColor = (owner: Owner) => COLORS[owner];

const isEnemy = (owner: Owner): boolean => {
  return owner !== Owner.Blue;
};

export { Owner, ownerColor, isEnemy };

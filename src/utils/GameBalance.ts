const BALANCE = {
  genRate: 1.5, // сек/юніт
  moveSpeed: 140, // швидкість "крапок"
  baseInterval: 1000, // базовий інтервал відправки 1 юніта по лінку
  minInterval: 220, // мінімальний інтервал
  maxUnits: 60, // кап очок у вежі
  ai: {
    period: 1700,
    sendThreshold: 7,
  },
};

export { BALANCE };

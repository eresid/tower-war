import Link from "../prefabs/Link";
import Tower from "../prefabs/Tower";
import MainScene from "../scenes/MainScene";

const addLinkWithCancelReverse = (scene: MainScene, links: Link[], from: Tower, to: Tower) => {
  const existing = findLink(links, from, to);
  if (existing) {
    existing.active = true;
    return;
  }

  const reverse = findLink(links, to, from);
  if (reverse) removeLink(links, reverse);

  links.push(new Link(scene, from, to));
};

const findLink = (links: Link[], from: Tower, to: Tower) => {
  return links.find((l) => l.from === from && l.to === to);
};

const removeLink = (links: Link[], link: Link) => {
  const i = links.indexOf(link);
  if (i >= 0) links.splice(i, 1);
};

const hasReverseActiveLink = (links: Link[], link: Link): boolean => {
  return links.some((l) => l !== link && l.active && l.from === link.to && l.to === link.from);
};

/** Скільки одночасних цілей дозволено для даної кількості юнітів */
const calcMaxTargets = (units: number): number => {
  if (units >= 30) return 3;
  if (units >= 10) return 2;
  return 1;
};

const canAttackMore = (links: Link[], from: Tower) => {
  const maxAllowed = calcMaxTargets(from.units);
  const outs = getActiveOutgoingLinks(links, from);
  return maxAllowed > outs.length;
};

/** Оновити індикатор атак на вежі (викликаємо щокадру або при зміні юнітів/лінків) */
const refreshTowerAttackUI = (links: Link[], tower: Tower) => {
  const maxAllowed = calcMaxTargets(tower.units);
  const used = getActiveOutgoingLinks(links, tower).length;
  tower.updateAttackSlots(maxAllowed, used);
};

/** Активні вихідні лінки з даної вежі */
const getActiveOutgoingLinks = (links: Link[], from: Tower): Link[] => {
  return links.filter((l) => l.active && l.from === from);
};

/** Обрати "пріоритетну" ціль серед активних лінків (можеш змінити стратегію) */
const pickPrimaryTarget = (links: Link[], from: Tower): Tower | null => {
  const outs = getActiveOutgoingLinks(links, from);
  if (outs.length === 0) return null;

  // варіант А: останній доданий лінк
  // return outs[outs.length - 1].to;

  // варіант Б (нині): найближча ціль
  outs.sort((a, b) => {
    const da = Phaser.Math.Distance.BetweenPoints(from.center, a.to.center);
    const db = Phaser.Math.Distance.BetweenPoints(from.center, b.to.center);
    return da - db;
  });
  return outs[0].to;
};

export {
  findLink,
  addLinkWithCancelReverse,
  hasReverseActiveLink,
  pickPrimaryTarget,
  canAttackMore,
  refreshTowerAttackUI,
};

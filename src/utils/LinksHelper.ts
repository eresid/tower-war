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

export { addLinkWithCancelReverse };

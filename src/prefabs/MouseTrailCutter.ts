import Phaser, { Scene } from "phaser";
import Link from "./Link";
import { Owner } from "../utils/GameHelper";

/** Мінімальний контракт "лінка" — зв'язок між двома вежами */
export interface LinkLike {
  active?: boolean;
  // Будь-які поля окрім from/to ігноруються
  from: {
    x: number;
    y: number;
    width: number;
    height: number;
    getWorldTransformMatrix: () => Phaser.GameObjects.Components.TransformMatrix;
  };
  to: {
    x: number;
    y: number;
    width: number;
    height: number;
    getWorldTransformMatrix: () => Phaser.GameObjects.Components.TransformMatrix;
  };
}

/** Опції для MouseTrailCutter */
export interface MouseTrailCutterOptions {
  /** товщина лінії різу */
  strokeWidth?: number;
  /** колір лінії */
  color?: number;
  /** прозорість лінії */
  alpha?: number;
  /** скільки останніх точок зберігати у трейлі */
  maxPoints?: number;
  /** мін. відстань між поінтами, щоб додавати нову точку */
  minPointDist?: number;
  /** глибина рендера (depth) */
  depth?: number;
  canCut?: (link: LinkLike) => boolean;
}

/** Допоміжна: центр контейнера у світових координатах */
export function centerWorld(obj: {
  width: number;
  height: number;
  getWorldTransformMatrix: () => Phaser.GameObjects.Components.TransformMatrix;
}) {
  const m = obj.getWorldTransformMatrix();
  const out = new Phaser.Math.Vector2();
  m.transformPoint(obj.width / 2, obj.height / 2, out);
  return out;
}

/**
 * MouseTrailCutter
 * — збирає траєкторію миші (trail)
 * — малює її як лінію/хвіст
 * — по mouseup: знаходить усі лінки, що перетнулись з відрізками трейлу, і передає їх у onCut
 */
export default class MouseTrailCutter {
  static instance(scene: Scene, links: Link[], player: Owner): MouseTrailCutter {
    const canCut = (link: LinkLike) => {
      const real = link as Link;
      const fromOwner = (real.from as any)?.owner;
      return fromOwner === player;
    };

    return new MouseTrailCutter(
      scene,
      // getLinks: повертає масив LinkLike
      () => links as LinkLike[],
      // onCut: що робити з перетнутим лінком
      (link) => {
        const idx = links.indexOf(link as any);
        if (idx >= 0) links.splice(idx, 1); // видаляємо лінк
      },
      {
        strokeWidth: 4,
        color: 0x22c55e, // можеш змінити на червоний 0xff4444
        alpha: 0.2,
        maxPoints: 20,
        minPointDist: 8,
        depth: 200, // поверх усього UI
        canCut,
      }
    );
  }

  private scene: Phaser.Scene;
  private gfx: Phaser.GameObjects.Graphics;
  private points: Phaser.Math.Vector2[] = [];
  private isActive = false;
  private opts: Required<MouseTrailCutterOptions>;

  /** колбек: повертає поточний список лінків */
  private getLinks: () => LinkLike[];

  /** колбек: викликається на кожен видалений лінк */
  private onCut: (link: LinkLike, at?: Phaser.Math.Vector2) => void;

  constructor(
    scene: Phaser.Scene,
    getLinks: () => LinkLike[],
    onCut: (link: LinkLike, at?: Phaser.Math.Vector2) => void,
    opts: MouseTrailCutterOptions = {}
  ) {
    this.scene = scene;
    this.getLinks = getLinks;
    this.onCut = onCut;

    this.opts = {
      strokeWidth: opts.strokeWidth ?? 4,
      color: opts.color ?? 0xff4444,
      alpha: opts.alpha ?? 0.9,
      maxPoints: opts.maxPoints ?? 32,
      minPointDist: opts.minPointDist ?? 10,
      depth: opts.depth ?? 120,
      canCut: opts.canCut ?? (() => true),
    };

    this.gfx = scene.add.graphics().setDepth(this.opts.depth);
    this.bindInput();
  }

  /** Підписка на події миші */
  private bindInput() {
    const input = this.scene.input;

    input.on("pointerdown", (p: Phaser.Input.Pointer, targets: any[]) => {
      // починаємо різати лише якщо клік НЕ по геймоб'єкту (щоб не конфліктувати з кліком по вежі)
      if (targets && targets.length > 0) return;
      this.start(p.worldX, p.worldY);
    });

    input.on("pointermove", (p: Phaser.Input.Pointer) => {
      if (!this.isActive) return;
      this.pushPoint(p.worldX, p.worldY);
      this.redraw();
    });

    input.on("pointerup", () => {
      if (!this.isActive) return;
      this.finish();
    });
  }

  /** Почати збір траси */
  start(x: number, y: number) {
    this.isActive = true;
    this.points.length = 0;
    this.points.push(new Phaser.Math.Vector2(x, y));
    this.redraw();
  }

  /** Додати точку у трейл (з фільтром по мін. відстані) */
  private pushPoint(x: number, y: number) {
    const last = this.points[this.points.length - 1];
    if (!last || Phaser.Math.Distance.Between(x, y, last.x, last.y) >= this.opts.minPointDist) {
      this.points.push(new Phaser.Math.Vector2(x, y));
      if (this.points.length > this.opts.maxPoints) this.points.shift();
    }
  }

  /** Перемалювати трейл */
  private redraw() {
    this.gfx.clear();
    if (this.points.length < 2) return;

    this.gfx.lineStyle(this.opts.strokeWidth, this.opts.color, this.opts.alpha);
    this.gfx.beginPath();
    this.gfx.moveTo(this.points[0].x, this.points[0].y);
    for (let i = 1; i < this.points.length; i++) {
      this.gfx.lineTo(this.points[i].x, this.points[i].y);
    }
    this.gfx.strokePath();

    // легкий “хвіст”
    this.gfx.lineStyle(Math.max(1, this.opts.strokeWidth - 2), this.opts.color, 0.4);
    for (let i = 1; i < this.points.length; i++) {
      this.gfx.strokeLineShape(
        new Phaser.Geom.Line(this.points[i - 1].x, this.points[i - 1].y, this.points[i].x, this.points[i].y)
      );
    }
  }

  /** Завершити: перевірити перетини та викликати onCut */
  private finish() {
    if (this.points.length < 2) {
      this.reset();
      return;
    }

    const links = this.getLinks();
    // кожну пару сусідніх точок розглядаємо як відрізок
    for (let i = 1; i < this.points.length; i++) {
      const seg = new Phaser.Geom.Line(this.points[i - 1].x, this.points[i - 1].y, this.points[i].x, this.points[i].y);

      for (const link of links) {
        if (link.active === false) continue;
        if (!this.opts.canCut(link)) continue;

        const a = centerWorld(link.from);
        const b = centerWorld(link.to);
        const linkLine = new Phaser.Geom.Line(a.x, a.y, b.x, b.y);

        if (Phaser.Geom.Intersects.LineToLine(seg, linkLine)) {
          const p = MouseTrailCutter.getLineIntersectionPoint(seg, linkLine);
          this.onCut(link, p ?? undefined);
        }
      }
    }

    this.reset();
  }

  private reset() {
    this.isActive = false;
    this.points.length = 0;
    this.gfx.clear();
  }

  /** Обчислити точку перетину двох ліній-ВІДРІЗКІВ */
  static getLineIntersectionPoint(l1: Phaser.Geom.Line, l2: Phaser.Geom.Line): Phaser.Math.Vector2 | null {
    const { x1, y1, x2, y2 } = l1;
    const { x1: x3, y1: y3, x2: x4, y2: y4 } = l2;
    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(denom) < 1e-6) return null;
    const px = ((x1 * y2 - y1 * x2) * (x3 - x4) - (x1 - x2) * (x3 * y4 - y3 * x4)) / denom;
    const py = ((x1 * y2 - y1 * x2) * (y3 - y4) - (y1 - y2) * (x3 * y4 - y3 * x4)) / denom;

    // перевіримо, що точка лежить всередині ОБОХ відрізків (а не прямих)
    const within = (x: number, y: number, L: Phaser.Geom.Line) =>
      x >= Math.min(L.x1, L.x2) - 1e-6 &&
      x <= Math.max(L.x1, L.x2) + 1e-6 &&
      y >= Math.min(L.y1, L.y2) - 1e-6 &&
      y <= Math.max(L.y1, L.y2) + 1e-6;

    if (!within(px, py, l1) || !within(px, py, l2)) return null;
    return new Phaser.Math.Vector2(px, py);
  }
}

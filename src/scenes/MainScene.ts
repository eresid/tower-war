import Phaser, { Geom } from "phaser";
import { Owner, ZIndex, isEnemyForPlayer, isOpponentFor } from "../utils/GameHelper";
import Tower from "../prefabs/Tower";
import Link from "../prefabs/Link";
import Soldier from "../prefabs/Soldier";
import { BALANCE } from "../utils/GameBalance";
import { Obstacle } from "../prefabs/Obstacle";
import MouseTrailCutter from "../prefabs/MouseTrailCutter";
import {
  addLinkWithCancelReverse,
  canAttackMore,
  findLink,
  pickPrimaryTarget,
  refreshTowerAttackUI,
} from "../utils/LinksHelper";

export default class MainScene extends Phaser.Scene {
  towers: Tower[] = [];
  links: Link[] = [];
  soldiers!: Phaser.GameObjects.Group;
  obstacles: Obstacle[] = [
    //{ x: 240, y: 340, width: 340, height: 24 }
  ];
  private aiOwners: Owner[] = [Owner.Red, Owner.Yellow];

  flowGfx!: Phaser.GameObjects.Graphics;
  obstacleGfx!: Phaser.GameObjects.Graphics;

  selectedTower: Tower | null = null;
  resultTxt!: Phaser.GameObjects.Text;

  constructor() {
    super("MainScene");
  }

  create() {
    // Loading Physics
    this.physics.world.setBounds(0, 0, this.scale.width, this.scale.height);

    // Loading Towers
    this.towers.push(Tower.spawn(this, 320, 140, Owner.Red, 1));
    this.towers.push(Tower.spawn(this, 160, 340, Owner.Neutral, 5));
    this.towers.push(Tower.spawn(this, 450, 560, Owner.Blue, 5));
    this.towers.push(Tower.spawn(this, 0, 0, Owner.Blue, 5));

    this.soldiers = this.add.group();
    this.flowGfx = this.add.graphics();
    this.obstacleGfx = this.add.graphics();

    // Loading Obstacles
    this.drawObstacles();

    // Setup Controls
    this.setupControls();

    // Win or Lose Text
    this.resultTxt = this.add
      .text(this.scale.width / 2, 36, "", { fontSize: "22px", color: "#111", fontStyle: "bold" })
      .setOrigin(0.5)
      .setDepth(ZIndex.UI);

    MouseTrailCutter.instance(this, this.links, Owner.Blue);

    this.time.addEvent({ delay: BALANCE.ai.period, loop: true, callback: () => this.aiTurn() });
  }

  private setupControls() {
    if (this.input.keyboard) {
      const spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
      spaceKey.on("down", () => {
        console.log("The Space clicked!");
      });
    }

    this.input.on("pointerdown", (p: any, targets: any[]) => {
      const tower: Tower | undefined = targets.find((o) => o instanceof Tower);
      if (!tower) return;

      // If there is no selected tower and we click on the enemy - do nothing
      if (!this.selectedTower && isEnemyForPlayer(tower.owner)) {
        return;
      }

      // If there is no selected tower, and we click on our own tower, we select it
      if (!this.selectedTower && !isEnemyForPlayer(tower.owner)) {
        this.setSelection(tower);
        return;
      }

      if (this.selectedTower && tower === this.selectedTower) {
        this.setSelection(null);
        return;
      }

      // If there is a selected tower, and we click on another own tower - support this tower
      if (this.selectedTower && !isEnemyForPlayer(tower.owner)) {
        if (canAttackMore(this.links, this.selectedTower)) {
          addLinkWithCancelReverse(this, this.links, this.selectedTower, tower);
        }

        this.setSelection(null);
        return;
      }

      // If there is a selected tower and we click on the enemy tower, we attack it
      if (this.selectedTower && isEnemyForPlayer(tower.owner)) {
        if (this.isClearPath(this.selectedTower.x, this.selectedTower.y, tower.x, tower.y)) {
          this.attackIfPossible(this.selectedTower, tower);
        }
      }

      // After the attack starts, we reset the selection
      this.setSelection(null);
    });
  }

  private attackIfPossible(from: Tower, to: Tower) {
    const canAttack = canAttackMore(this.links, from);
    if (!canAttack) {
      this.setSelection(null);
      return;
    }

    const existing = findLink(this.links, from, to);
    if (!existing) {
      this.links.push(new Link(this, from, to));
    } else {
      existing.active = true; // на випадок, якщо колись відключали
    }
  }

  private setSelection(tower: Tower | null) {
    if (this.selectedTower) {
      this.selectedTower.setSelected(false);
    }

    this.selectedTower = tower;

    if (this.selectedTower) {
      this.selectedTower.setSelected(true);
    }
  }

  /** Чи чистий шлях між двома точками (без перешкод) */
  isClearPath(x1: number, y1: number, x2: number, y2: number): boolean {
    if (this.obstacles.length === 0) return true;
    const line = new Geom.Line(x1, y1, x2, y2);
    for (const ob of this.obstacles) {
      const rect = new Geom.Rectangle(ob.x, ob.y, ob.width, ob.height);
      if (Geom.Intersects.GetLineToRectangle(line, rect)) return false;
    }
    return true;
  }

  /** Відправка 1 юніта по лінку */
  emitOne(from: Tower, to: Tower) {
    if (from.units < 1) return;

    this.soldiers.add(Soldier.spawn(this, from.centerX, from.centerY, from, to));
  }

  /** Переслати солдата далі: знищує вхідного і випускає нового у напрямку цілі */
  forwardSoldier(from: Tower, to: Tower) {
    // випускаємо нового, не змінюючи лічильник у вежі (вона і так на максимумі)
    const s = new Soldier(this, from.center.x, from.center.y, from, to);
    this.soldiers.add(s);
    const ang = Phaser.Math.Angle.Between(from.center.x, from.center.y, to.center.x, to.center.y);
    (s.body as Phaser.Physics.Arcade.Body).setVelocity(
      Math.cos(ang) * BALANCE.moveSpeed,
      Math.sin(ang) * BALANCE.moveSpeed
    );
  }

  // Processing the arrival of a soldier to the tower
  handleArrival(soldier: Soldier, tower: Tower) {
    if (!soldier.active) return;

    if (tower.owner === soldier.owner) {
      // СВОЯ: якщо кап ще не досягнуто — додаємо 1
      if (tower.units < BALANCE.maxUnits) {
        // Reinforcement: +1, but no more than BALANCE.maxUnits
        tower.units = Math.min(tower.units + 1, BALANCE.maxUnits);
        tower.updateLabel();
        soldier.destroy();
        return;
      }

      // КАП досягнуто: якщо ця вежа когось атакує — переслати солдата далі
      const target = pickPrimaryTarget(this.links, tower);
      if (target && this.isClearPath(tower.x, tower.y, target.x, target.y)) {
        this.forwardSoldier(tower, target);
        soldier.destroy();
        // tower.units НЕ змінюємо (вежа повна)
        return;
      }

      // Якщо немає активної цілі — просто поглинаємо (залишаємось на максимумі)
      // (за бажанням можна відправити на найближчого ворога/нейтрала)
    } else {
      // Attack: −1, possible tower capture
      tower.units -= 1;
      if (tower.units < 0) {
        tower.setOwner(soldier.owner);
        tower.units = 1;

        this.stopAllAttacksFrom(tower, true);
      }
    }

    tower.updateLabel();
    soldier.destroy();
  }

  update(_time: number, delta: number) {
    for (const tower of this.towers) {
      tower.tick(delta);
      refreshTowerAttackUI(this.links, tower);
    }

    // апдейт лінків + промальовка напрямку
    this.flowGfx.clear();
    for (const link of this.links) {
      link.update(delta);
      link.draw(this.flowGfx);
    }

    // Зіткнення солдатів
    this.resolveSoldierMeetings();

    // Arrival of the soldier at the tower
    const soldiers = this.soldiers.getChildren() as Soldier[];
    soldiers.forEach((soldier) => {
      if (!soldier.active) return;
      if (soldier.destroyIfOutOfBounds(this)) return;

      const targetTower: Tower = (soldier as Soldier).targetTower;

      const distance = Phaser.Math.Distance.Between(soldier.x, soldier.y, targetTower.centerX, targetTower.centerY);
      if (distance <= targetTower.radius) {
        this.handleArrival(soldier as Soldier, targetTower);
      }
    });

    // Game Over Check
    const owners = new Set(this.towers.map((t) => t.owner));
    if (owners.size === 1) {
      const w = owners.values().next().value as Owner;
      this.resultTxt.setText(w === Owner.Blue ? "You won! 🎉" : "You lost 🙈");
    } else {
      this.resultTxt.setText("");
    }
  }

  /** Малюємо перешкоди (debug/стиль) */
  private drawObstacles() {
    this.obstacleGfx.clear();
    if (this.obstacles.length === 0) return;
    this.obstacleGfx.fillStyle(0x0f172a, 0.12);
    this.obstacleGfx.lineStyle(2, 0x0f172a, 0.35);
    for (const ob of this.obstacles) {
      this.obstacleGfx.fillRect(ob.x, ob.y, ob.width, ob.height);
      this.obstacleGfx.strokeRect(ob.x, ob.y, ob.width, ob.height);
    }
  }

  private aiTurn() {
    for (const ai of this.aiOwners) {
      // мої вежі з достатньою кількістю юнітів
      const mine = this.towers.filter((t) => t.owner === ai && t.units >= BALANCE.ai.sendThreshold);
      if (mine.length === 0) continue;

      const from = Phaser.Utils.Array.GetRandom(mine);

      // цілі: всі НЕ мої (включно з нейтралами і іншим AI)
      const targets = this.towers.filter((t) => isOpponentFor(ai, t.owner));
      if (targets.length === 0) continue;

      // вибір пріоритетної цілі: ближче + менше юнітів
      const to = targets
        .map((t) => ({
          t,
          score: Phaser.Math.Distance.Between(from.x, from.y, t.x, t.y) * 0.02 + t.units,
        }))
        .sort((a, b) => a.score - b.score)[0].t;

      if (!this.isClearPath(from.x, from.y, to.x, to.y)) continue;

      // створюємо лінк, якщо його ще немає
      this.attackIfPossible(from, to);
    }
  }

  private resolveSoldierMeetings() {
    type Bucket = {
      A: Tower;
      B: Tower;
      Apos: Phaser.Math.Vector2;
      Bpos: Phaser.Math.Vector2;
      forward: Soldier[];
      backward: Soldier[];
    };
    const buckets = new Map<string, Bucket>();

    // Розкладаємо солдатів по “ребрах” (незорієнтовано)
    const objs = this.soldiers.getChildren() as Phaser.GameObjects.GameObject[];
    for (const obj of objs) {
      const s = obj as Soldier;
      if (!s.active) continue;

      const key = this.edgeKeyUndirected(s.sourceTower, s.targetTower);
      let b = buckets.get(key);
      if (!b) {
        const Apos = s.sourceTower.center;
        const Bpos = s.targetTower.center;
        // нормалізуємо напрям: forward = від меншого ключа до більшого
        const edgeKey = this.edgeKeyUndirected(s.sourceTower, s.targetTower);
        const sortedAB = edgeKey.split("|").map((k) => k.split(",").map(Number)); // [[ax,ay],[bx,by]]
        const [sx, sy] = sortedAB[0];
        const [tx, ty] = sortedAB[1];

        // визначимо A/B як ті вежі, чий центр збігається з sortedAB[0]/[1]
        const centerS = s.sourceTower.center;
        const same = (p: Phaser.Math.Vector2, x: number, y: number) =>
          Math.abs(p.x - x) < 0.6 && Math.abs(p.y - y) < 0.6;
        const A = same(centerS, sx, sy) ? s.sourceTower : s.targetTower;
        const B = A === s.sourceTower ? s.targetTower : s.sourceTower;

        b = { A, B, Apos: A.center, Bpos: B.center, forward: [], backward: [] };
        buckets.set(key, b);
      }

      // напрямок: forward = рух від A до B
      const isForward = s.sourceTower === b.A && s.targetTower === b.B;
      (isForward ? b.forward : b.backward).push(s);
    }

    // Для кожного ребра — зіставляємо найближчі назустріч
    const meetPx = 12; // радіуси ~6, беремо невеликий зазор
    for (const b of buckets.values()) {
      if (b.forward.length === 0 || b.backward.length === 0) continue;

      // Обчислити прогрес t кожного солдата і відсортувати
      const fw = b.forward
        .map((s) => ({ s, t: this.progressAlongEdge(new Phaser.Math.Vector2(s.x, s.y), b.Apos, b.Bpos) }))
        .sort((a, b2) => a.t - b2.t);
      const bw = b.backward
        .map((s) => ({ s, t: this.progressAlongEdge(new Phaser.Math.Vector2(s.x, s.y), b.Apos, b.Bpos) }))
        .sort((a, b2) => a.t - b2.t);

      // Два вказівники з протилежних кінців: fw зліва->праворуч, bw справа->ліворуч
      let i = 0,
        j = bw.length - 1;
      const edgeLen = Phaser.Math.Distance.Between(b.Apos.x, b.Apos.y, b.Bpos.x, b.Bpos.y);

      while (i < fw.length && j >= 0) {
        const dAlong = Math.abs(fw[i].t - bw[j].t) * edgeLen;
        if (dAlong <= meetPx) {
          // самознищення пари
          fw[i].s.destroy();
          bw[j].s.destroy();
          i++;
          j--;
        } else {
          // підсуваємо той, хто ближче до центру
          if (fw[i].t < 1 - bw[j].t) i++;
          else j--;
        }
      }
    }
  }

  private edgeKeyUndirected(a: Tower, b: Tower): string {
    const k1 = `${a.centerX.toFixed(1)},${a.centerY.toFixed(1)}`;
    const k2 = `${b.centerX.toFixed(1)},${b.centerY.toFixed(1)}`;
    return k1 < k2 ? `${k1}|${k2}` : `${k2}|${k1}`;
  }

  private progressAlongEdge(pos: Phaser.Math.Vector2, A: Phaser.Math.Vector2, B: Phaser.Math.Vector2): number {
    // t у [0..1] вздовж відрізка AB
    const vx = B.x - A.x,
      vy = B.y - A.y;
    const wx = pos.x - A.x,
      wy = pos.y - A.y;
    const len2 = vx * vx + vy * vy || 1;
    const t = (wx * vx + wy * vy) / len2;
    return Phaser.Math.Clamp(t, 0, 1);
  }

  /** Зупиняє всі вихідні атаки (лінки) з вежі.
   *  Якщо killProjectiles=true — знищує солдатів, випущених цією вежею.
   */
  private stopAllAttacksFrom(tower: Tower, killProjectiles = true) {
    // прибрати вихідні лінки
    this.links = this.links.filter((l) => l.from !== tower);

    // (опційно) прибрати «кульки», випущені цією вежею
    if (killProjectiles) {
      for (const obj of this.soldiers.getChildren() as Phaser.GameObjects.GameObject[]) {
        const s = obj as Soldier;
        if (!s.active) continue;
        if (s.sourceTower === tower) s.destroy();
      }
    }

    // оновити індикатор слотів (якщо використовуєш UI атак)
    if (typeof (tower as any).updateAttackSlots === "function") {
      refreshTowerAttackUI(this.links, tower);
    }
  }
}

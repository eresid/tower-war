import Phaser from "phaser";
import { Owner } from "../utils/GameHelper";
import Tower from "../prefabs/Tower";
import Link from "../prefabs/Link";
import Soldier from "../prefabs/Soldier";
import { BALANCE } from "../utils/GameBalance";
import { Obstacle } from "../prefabs/Obstacle";

export default class MainScene extends Phaser.Scene {
  towers: Tower[] = [];
  links: Link[] = [];
  soldiers!: Phaser.GameObjects.Group;

  obstacles: Obstacle[] = [
    // приклад — порожньо; додай прямокутники за потреби
    { x: 240, y: 340, width: 340, height: 24 },
  ];

  flowGfx!: Phaser.GameObjects.Graphics;
  obstacleGfx!: Phaser.GameObjects.Graphics;

  selectedTower: Tower | null = null;
  resultTxt!: Phaser.GameObjects.Text;

  constructor() {
    super("MainScene");
  }

  create() {
    // Load Physics
    this.physics.world.setBounds(0, 0, this.scale.width, this.scale.height);

    // Load Towers
    this.towers.push(Tower.spawn(this, 320, 140, Owner.Red, 25));
    this.towers.push(Tower.spawn(this, 160, 340, Owner.Neutral, 5));
    this.towers.push(Tower.spawn(this, 450, 560, Owner.Blue, 19));

    this.soldiers = this.add.group();
    this.flowGfx = this.add.graphics();
    this.obstacleGfx = this.add.graphics();

    // перешкоди (оформлення)
    this.drawObstacles();

    // --- Керування кліками ---
    this.input.on("pointerdown", (p: any, targets: any[]) => {
      const t: Tower | undefined = targets.find((o) => o instanceof Tower);
      if (!t) return;

      // якщо нічого не вибрано — вибрати
      if (!this.selectedTower) {
        this.setSelection(t);
        return;
      }

      // якщо натиснули на ту ж — зняти виділення
      if (this.selectedTower === t) {
        this.setSelection(null);
        return;
      }

      // є вибір і натиснули на іншу вежу -> почати атаку (створити/увімкнути лінк)
      if (this.isClearPath(this.selectedTower.x, this.selectedTower.y, t.x, t.y)) {
        const existing = this.links.find((l) => l.from === this.selectedTower && l.to === t);
        if (!existing) {
          this.links.push(new Link(this, this.selectedTower, t));
        } else {
          existing.active = true; // на випадок, якщо колись відключали
        }
      }
      // після старту атаки скидаємо вибір
      this.setSelection(null);
    });

    this.resultTxt = this.add
      .text(this.scale.width / 2, 36, "", { fontSize: "22px", color: "#111", fontStyle: "bold" })
      .setOrigin(0.5);
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
    const line = new Phaser.Geom.Line(x1, y1, x2, y2);
    for (const ob of this.obstacles) {
      const rect = new Phaser.Geom.Rectangle(ob.x, ob.y, ob.width, ob.height);
      if (Phaser.Geom.Intersects.GetLineToRectangle(line, rect)) return false;
    }
    return true;
  }

  /** Відправка 1 юніта по лінку */
  emitOne(from: Tower, to: Tower) {
    if (from.units < 1) return;
    from.units = Math.max(0, from.units - 1);
    from.updateLabel();

    this.soldiers.add(Soldier.spawn(this, from.x, from.y, from, to));
  }

  /** Прибуття юніта у вежу */
  handleArrival(s: Soldier, tower: Tower) {
    if (!s.active) return;

    if (tower.owner === s.owner) {
      // Підкріплення: +1, але не більше 60
      tower.units = Math.min(tower.units + 1, BALANCE.maxUnits);
    } else {
      // Атака: −1, можливе захоплення
      tower.units -= 1;
      if (tower.units < 0) {
        tower.setOwner(s.owner);
        tower.units = Math.min(Math.abs(tower.units), BALANCE.maxUnits);
      }
    }
    tower.updateLabel();
    s.destroy();
  }

  update(_time: number, delta: number) {
    // генерація
    for (const t of this.towers) t.tick(delta);

    // апдейт лінків + промальовка напрямку
    this.flowGfx.clear();
    for (const link of this.links) {
      link.update(delta);
      link.draw(this.flowGfx);
    }

    // прибуття "крапок"
    this.soldiers.children.each((s: any) => {
      if (!s.active) return;
      const tw: Tower = (s as Soldier).targetTower;
      const d = Phaser.Math.Distance.Between(s.x, s.y, tw.x, tw.y);
      if (d <= tw.radius - 2) this.handleArrival(s as Soldier, tw);
    });

    // завершення гри
    const owners = new Set(this.towers.map((t) => t.owner));
    if (owners.size === 1) {
      const w = owners.values().next().value as Owner;
      this.resultTxt.setText(w === Owner.Blue ? "Перемога! 🎉" : "Поразка 🙈");
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
}

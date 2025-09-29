import Phaser, { Geom } from "phaser";
import { Owner, ZIndex, isEnemy } from "../utils/GameHelper";
import Tower from "../prefabs/Tower";
import Link from "../prefabs/Link";
import Soldier from "../prefabs/Soldier";
import { BALANCE } from "../utils/GameBalance";
import { Obstacle } from "../prefabs/Obstacle";
import MouseTrailCutter from "../prefabs/MouseTrailCutter";
import { addLinkWithCancelReverse } from "../utils/LinksHelper";

export default class MainScene extends Phaser.Scene {
  towers: Tower[] = [];
  links: Link[] = [];
  soldiers!: Phaser.GameObjects.Group;
  obstacles: Obstacle[] = [
    //{ x: 240, y: 340, width: 340, height: 24 }
  ];

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
    this.towers.push(Tower.spawn(this, 320, 140, Owner.Red, 25));
    this.towers.push(Tower.spawn(this, 160, 340, Owner.Neutral, 5));
    this.towers.push(Tower.spawn(this, 450, 560, Owner.Blue, 19));
    this.towers.push(Tower.spawn(this, 0, 0, Owner.Blue, 19));

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

    MouseTrailCutter.instance(this, this.links);
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
      if (!this.selectedTower && isEnemy(tower.owner)) {
        return;
      }

      // If there is no selected tower, and we click on our own tower, we select it
      if (!this.selectedTower && !isEnemy(tower.owner)) {
        this.setSelection(tower);
        return;
      }

      if (this.selectedTower && tower === this.selectedTower) {
        this.setSelection(null);
        return;
      }

      // If there is a selected tower, and we click on another own tower - support this tower
      if (this.selectedTower && !isEnemy(tower.owner)) {
        addLinkWithCancelReverse(this, this.links, this.selectedTower, tower);
        this.setSelection(null);
        return;
      }

      // If there is a selected tower and we click on the enemy tower, we attack it
      if (this.selectedTower && isEnemy(tower.owner)) {
        if (this.isClearPath(this.selectedTower.x, this.selectedTower.y, tower.x, tower.y)) {
          console.log("WE CAN ATTACK :)");
          const existing = this.links.find((l) => l.from === this.selectedTower && l.to === tower);
          if (!existing) {
            this.links.push(new Link(this, this.selectedTower, tower));
          } else {
            existing.active = true; // на випадок, якщо колись відключали
          }
        } else {
          console.log("WE CANNOT ATTACK :(");
        }
      }

      // After the attack starts, we reset the selection
      this.setSelection(null);
    });
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

  /** Прибуття юніта у вежу */
  handleArrival(soldier: Soldier, tower: Tower) {
    if (!soldier.active) return;

    if (tower.owner === soldier.owner) {
      // Reinforcement: +1, but no more than BALANCE.maxUnits
      tower.units = Math.min(tower.units + 1, BALANCE.maxUnits);
    } else {
      // Attack: −1, possible tower capture
      tower.units -= 1;
      if (tower.units < 0) {
        tower.setOwner(soldier.owner);
        tower.units = 1;
      }
    }

    tower.updateLabel();
    soldier.destroy();
  }

  update(_time: number, delta: number) {
    for (const t of this.towers) t.tick(delta);

    // апдейт лінків + промальовка напрямку
    this.flowGfx.clear();
    for (const link of this.links) {
      link.update(delta);
      link.draw(this.flowGfx);
    }

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
}

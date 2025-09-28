import { Physics, Scene } from "phaser";
import { Owner, ZIndex, ownerColor } from "../utils/GameHelper";
import Tower from "./Tower";
import { BALANCE } from "../utils/GameBalance";

export default class Soldier extends Phaser.GameObjects.Arc {
  targetTower: Tower;
  owner: Owner;

  static spawn(scene: Scene, x: number, y: number, from: Tower, to: Tower): Soldier {
    const soldier = new Soldier(scene, x, y, ownerColor(from.owner), to, to.owner);

    const angle = Phaser.Math.Angle.Between(from.centerX, from.centerY, to.centerX, to.centerY);
    (soldier.body as Physics.Arcade.Body).setVelocity(
      Math.cos(angle) * BALANCE.moveSpeed,
      Math.sin(angle) * BALANCE.moveSpeed
    );

    return soldier;
  }

  constructor(scene: Scene, x: number, y: number, color: number, targetTower: Tower, owner: Owner) {
    super(scene, x, y, 6, 0, 360, false, color, 1); // радіус збільшено: 6
    this.targetTower = targetTower;
    this.owner = owner;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    (this.body as Physics.Arcade.Body).setCircle(6);
    this.setDepth(ZIndex.Soldiers);
  }
}

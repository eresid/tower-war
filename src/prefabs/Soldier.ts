import { Owner } from "../utils/GameHelper";
import Tower from "./Tower";

export default class Soldier extends Phaser.GameObjects.Arc {
  targetTower: Tower;
  owner: Owner;

  constructor(scene: Phaser.Scene, x: number, y: number, color: number, targetTower: Tower, owner: Owner) {
    super(scene, x, y, 6, 0, 360, false, color, 1); // радіус збільшено: 6
    this.targetTower = targetTower;
    this.owner = owner;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    (this.body as Phaser.Physics.Arcade.Body).setCircle(6);
  }
}

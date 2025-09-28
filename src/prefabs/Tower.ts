import { BALANCE } from "../utils/GameBalance";
import { Owner, ownerColor } from "../utils/GameHelper";

export default class Tower extends Phaser.GameObjects.Container {
  owner: Owner;
  units: number;
  maxUnits: number;
  radius: number;
  circle: Phaser.GameObjects.Arc;
  base: Phaser.GameObjects.Arc;
  label: Phaser.GameObjects.Text;
  selectRing: Phaser.GameObjects.Arc;
  lastGen: number;

  constructor(scene: Phaser.Scene, x: number, y: number, owner: Owner, startUnits = 10, maxUnits = BALANCE.maxUnits) {
    super(scene, x, y);
    this.owner = owner;
    this.units = Math.min(startUnits, BALANCE.maxUnits);
    this.maxUnits = Math.min(maxUnits, BALANCE.maxUnits);
    this.radius = 26;

    this.base = scene.add.arc(0, 0, this.radius + 6, 0, 360, false, 0x000000, 0.06);
    this.circle = scene.add.arc(0, 0, this.radius, 0, 360, false, ownerColor(owner), 1);
    this.circle.setStrokeStyle(3, 0xffffff, 0.9);
    this.label = scene.add
      .text(0, 0, `${this.units}`, { fontSize: "16px", color: "#ffffff", fontStyle: "bold" })
      .setOrigin(0.5);

    // кільце виділення (приховане)
    this.selectRing = scene.add.arc(0, 0, this.radius + 10, 0, 360, false, 0x000000, 0);
    this.selectRing.setStrokeStyle(3, 0x334155, 0.85);
    this.selectRing.setVisible(false);

    this.add([this.base, this.circle, this.label, this.selectRing]);
    scene.add.existing(this);

    this.setSize(this.radius * 2, this.radius * 2);
    this.setInteractive(new Phaser.Geom.Circle(0, 0, this.radius + 8), Phaser.Geom.Circle.Contains);

    this.lastGen = 0;
  }

  setOwner(owner: Owner) {
    this.owner = owner;
    this.circle.fillColor = ownerColor(owner);
  }

  setSelected(on: boolean) {
    this.selectRing.setVisible(on);
  }

  updateLabel() {
    this.label.setText(`${Math.max(0, Math.floor(this.units))}`);
  }

  tick(delta: number) {
    if (this.owner !== Owner.Neutral) {
      this.lastGen += delta;
      const per = BALANCE.genRate * 1000;
      if (this.lastGen >= per) {
        const add = Math.floor(this.lastGen / per);
        this.units = Math.min(this.units + add, BALANCE.maxUnits);
        this.lastGen -= add * per;
        this.updateLabel();
      }
    }
  }
}

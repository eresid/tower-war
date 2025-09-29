import { Geom, Scene } from "phaser";
import { BALANCE } from "../utils/GameBalance";
import { Owner, ZIndex, ownerColor } from "../utils/GameHelper";

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
  centerX: number;
  centerY: number;

  static spawn(scene: Scene, x: number, y: number, owner: Owner, units: number, max?: number): Tower {
    return new Tower(scene, x, y, owner, units, max || BALANCE.maxUnits);
  }

  constructor(scene: Phaser.Scene, x: number, y: number, owner: Owner, startUnits = 10, maxUnits = BALANCE.maxUnits) {
    super(scene, x, y);
    this.owner = owner;
    this.units = Math.min(startUnits, BALANCE.maxUnits);
    this.maxUnits = Math.min(maxUnits, BALANCE.maxUnits);
    this.radius = 26;

    // Container size (need for hitArea)
    this.setSize(this.radius * 2, this.radius * 2);
    this.setDepth(ZIndex.Towers);

    // Center of local coordinates
    const cx = this.width / 2; // = this.radius
    const cy = this.height / 2; // = this.radius

    this.centerX = this.x + cx;
    this.centerY = this.y + cy;

    // Creating elements with a position in the center of the container
    this.base = scene.add.arc(cx, cy, this.radius + 6, 0, 360, false, 0x000000, 0.06);
    this.circle = scene.add.arc(cx, cy, this.radius, 0, 360, false, ownerColor(owner), 1);
    this.circle.setStrokeStyle(3, 0xffffff, 0.9);

    this.label = scene.add
      .text(cx, cy, `${this.units}`, {
        fontSize: "18px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    // Selection ring (optional)
    this.selectRing = scene.add
      .arc(cx, cy, this.radius + 10, 0, 360, false, 0x000000, 0)
      .setStrokeStyle(3, 0x334155, 0.85)
      .setVisible(false);

    this.add([this.base, this.circle, this.label, this.selectRing]);
    scene.add.existing(this);

    const shape = new Geom.Circle(cx * 2, cy * 2, this.radius);
    this.setInteractive(shape, Geom.Circle.Contains);

    this.lastGen = 0;
  }

  setOwner(owner: Owner) {
    this.owner = owner;
    this.circle.fillColor = ownerColor(owner);
  }

  setSelected(selected: boolean) {
    this.selectRing.setVisible(selected);
  }

  updateLabel() {
    const units = Math.max(0, Math.floor(this.units));
    const unitTxt = units === BALANCE.maxUnits ? "Max" : `${this.units}`;
    this.label.setText(unitTxt);
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

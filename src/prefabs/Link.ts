import MainScene from "../scenes/MainScene";
import { BALANCE } from "../utils/GameBalance";
import { ZIndex } from "../utils/GameHelper";
import Tower from "./Tower";

export default class Link {
  scene: MainScene;
  from: Tower;
  to: Tower;
  acc = 0;
  flowPhase = 0;
  active = true;

  constructor(scene: MainScene, from: Tower, to: Tower) {
    this.scene = scene;
    this.from = from;
    this.to = to;
  }

  /** Чим більше юнітів у джерелі — тим швидше тече */
  getInterval() {
    const u = Math.max(0, this.from.units);
    const factor = 1 / (0.3 + u / BALANCE.maxUnits); // 0.3..~3.3
    return Phaser.Math.Clamp(BALANCE.baseInterval * factor, BALANCE.minInterval, BALANCE.baseInterval * 2.2);
  }

  update(delta: number) {
    if (!this.active) return;
    if (!this.scene.isClearPath(this.from.centerX, this.from.centerY, this.to.centerX, this.to.centerY)) return;

    this.acc += delta;
    this.flowPhase = (this.flowPhase + delta * 0.12) % 10000;
    const needed = this.getInterval();
    if (this.acc >= needed && this.from.units >= 1) {
      this.acc -= needed;
      this.scene.emitOne(this.from, this.to);
    }
  }

  draw(gfx: Phaser.GameObjects.Graphics) {
    const { from, to } = this;
    if (!this.scene.isClearPath(from.centerX, from.centerY, to.centerX, to.centerY)) return;

    const len = Phaser.Math.Distance.Between(from.centerX, from.centerY, to.centerX, to.centerY);
    const spacing = 18;
    const count = Math.max(2, Math.floor(len / spacing));
    const dx = (to.centerX - from.centerX) / len;
    const dy = (to.centerY - from.centerY) / len;

    for (let i = 0; i < count; i++) {
      const t = (i * spacing + this.flowPhase) % len;
      const x = from.centerX + dx * t;
      const y = from.centerY + dy * t;
      gfx.fillStyle(0x94a3b8, 0.25); // gray with some alpha
      gfx.fillCircle(x, y, 3);
      gfx.setDepth(ZIndex.Paths);
    }
  }
}

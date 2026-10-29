
export default class Collectible {
  kind = 'crystal'
  pickupDistance = 1.4

  private ctx: any
  private baseY = 1.0
  private isCollected = false

  onInit(ctx: any) {
    this.ctx = ctx
    const pos = this.getPos()
    this.baseY = pos.y
  }

  private getPos(target?: any) {
    const t = target || this.ctx
    if (!t) return { x: 0, y: 0, z: 0 }
    if (t.object3D && t.object3D.position) return t.object3D.position
    if (typeof t.getTransform === 'function') return t.getTransform().position
    if (t.entity && typeof t.entity.getTransform === 'function') return t.entity.getTransform().position
    return { x: 0, y: 0, z: 0 }
  }

  onUpdate(dt: number) {
    if (this.isCollected) return

    const myPos = this.getPos()
    if (this.ctx.object3D && this.ctx.object3D.rotation) {
      this.ctx.object3D.rotation.y += dt * 2.2
    }
    myPos.y = this.baseY + Math.sin((this.ctx.time || 0) * 3.5) * 0.12

    const player = this.ctx.scene.find('player')
    if (!player) return
    const pPos = this.getPos(player)

    const dx = myPos.x - pPos.x
    const dy = myPos.y - pPos.y
    const dz = myPos.z - pPos.z
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)

    if (dist <= this.pickupDistance) {
      this.collect()
    }
  }

  private collect() {
    this.isCollected = true

    if (this.kind === 'crystal') {
      this.ctx.emit('crystal_collected')
    } else if (this.kind === 'heart') {
      this.ctx.emit('heart_scale_collected')
    } else if (this.kind === 'moon_shard') {
      this.ctx.emit('moon_shard_claimed')
    }

    const myPos = this.getPos()
    myPos.y = -50
    if (this.ctx.object3D) {
      this.ctx.object3D.visible = false
    }
  }
}

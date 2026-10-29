
import { Vector3 } from 'three'

export default class CameraController {
  private ctx: any
  private targetOffset = new Vector3(0, 9.0, 10.5)
  private lookOffset = new Vector3(0, 1.4, 0)
  private currentPos = new Vector3(0, 9.0, 10.5)

  onInit(ctx: any) {
    this.ctx = ctx
  }

  private getPos(target: any) {
    if (!target) return { x: 0, y: 0, z: 0 }
    if (target.object3D && target.object3D.position) return target.object3D.position
    if (typeof target.getTransform === 'function') return target.getTransform().position
    if (target.entity && typeof target.entity.getTransform === 'function') return target.entity.getTransform().position
    return { x: 0, y: 0, z: 0 }
  }

  onLateUpdate(dt: number) {
    const players = this.ctx.scene.findByTag('Player')
    if (!players || players.length === 0) return
    const player = players[0]
    const pPos = this.getPos(player)

    const desiredPos = new Vector3(
      pPos.x + this.targetOffset.x,
      pPos.y + this.targetOffset.y,
      pPos.z + this.targetOffset.z
    )

    const t = Math.min(1, dt * 6)
    this.currentPos.lerp(desiredPos, t)

    if (this.ctx.object3D) {
      this.ctx.object3D.position.copy(this.currentPos)
      const lookTarget = new Vector3(
        pPos.x + this.lookOffset.x,
        pPos.y + this.lookOffset.y,
        pPos.z + this.lookOffset.z
      )
      this.ctx.object3D.lookAt(lookTarget)
    } else if (this.ctx.entity && typeof this.ctx.entity.getTransform === 'function') {
      const transform = this.ctx.entity.getTransform()
      transform.position.x = this.currentPos.x
      transform.position.y = this.currentPos.y
      transform.position.z = this.currentPos.z
    }
  }
}


export default class EnemyController {
  hp = 2
  maxHp = 2
  speed = 2.2
  damage = 1
  aggroDist = 8.0
  isBoss = false

  private ctx: any
  private baseY = 0.5
  private attackCooldown = 0
  private hitStunTimer = 0
  private knockbackVel = { x: 0, y: 0, z: 0 }
  private isDead = false

  onInit(ctx: any) {
    this.ctx = ctx
    const pos = this.getPos()
    this.baseY = pos.y

    ctx.on('player_hit_enemy', (data: any) => {
      if (data.targetId === ctx.entity.id && !this.isDead) {
        this.takeDamage(data.damage, data.knockback)
      }
    })
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
    if (this.isDead) return

    if (this.attackCooldown > 0) this.attackCooldown -= dt

    if (this.hitStunTimer > 0) {
      this.hitStunTimer -= dt
      const myPos = this.getPos()
      myPos.x += this.knockbackVel.x * dt
      myPos.z += this.knockbackVel.z * dt
      this.knockbackVel.x *= 0.85
      this.knockbackVel.z *= 0.85
      return
    }

    const player = this.ctx.scene.find('player')
    if (!player) return
    const pPos = this.getPos(player)
    const myPos = this.getPos()

    const dx = pPos.x - myPos.x
    const dz = pPos.z - myPos.z
    const dist = Math.sqrt(dx * dx + dz * dz)

    if (dist <= this.aggroDist) {
      const invDist = dist > 0.001 ? 1 / dist : 0
      const dirX = dx * invDist
      const dirZ = dz * invDist

      if (dist > 1.2) {
        myPos.x += dirX * this.speed * dt
        myPos.z += dirZ * this.speed * dt

        if (!this.isBoss) {
          myPos.y = this.baseY + Math.abs(Math.sin((this.ctx.time || 0) * 7)) * 0.4
        }
      } else {
        if (this.attackCooldown <= 0) {
          this.attackPlayer(player)
        }
      }

      if (this.ctx.object3D) {
        this.ctx.object3D.lookAt(pPos.x, myPos.y, pPos.z)
      }
    } else {
      myPos.y = this.baseY + Math.sin((this.ctx.time || 0) * 2) * 0.1
    }
  }

  private attackPlayer(player: any) {
    this.attackCooldown = 1.2
    this.ctx.emit('enemy_attack_player', { damage: this.damage })

    if (player.script && player.script.instance) {
      player.script.instance.takeDamage(this.damage)
    }
  }

  private takeDamage(amount: number, knockback?: any) {
    this.hp -= amount
    this.hitStunTimer = 0.25

    if (knockback) {
      this.knockbackVel.x = knockback.x || 0
      this.knockbackVel.y = knockback.y || 0
      this.knockbackVel.z = knockback.z || 0
    }

    if (this.ctx.object3D && this.ctx.object3D.scale) {
      this.ctx.object3D.scale.multiplyScalar(0.75)
      setTimeout(() => {
        if (this.ctx && this.ctx.object3D && this.ctx.object3D.scale) {
          this.ctx.object3D.scale.multiplyScalar(1.33)
        }
      }, 150)
    }

    if (this.hp <= 0) {
      this.die()
    }
  }

  private die() {
    this.isDead = true
    this.ctx.emit('enemy_defeated', { id: this.ctx.entity.id, isBoss: this.isBoss })

    const myPos = this.getPos()
    myPos.y = -20
    if (this.ctx.object3D) {
      this.ctx.object3D.visible = false
    }
  }
}

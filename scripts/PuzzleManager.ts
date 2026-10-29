
export default class PuzzleManager {
  leverActivated = false
  brazierLit = false
  platePressed = false
  gateOpen = false
  secretWallBroken = false

  private ctx: any

  onInit(ctx: any) {
    this.ctx = ctx

    ctx.on('tail_trigger_activated', (data: any) => {
      if (data.id === 'puzzle-lever' && !this.leverActivated) {
        this.leverActivated = true
        this.animateLever()
        this.checkGateConditions()
      }
    })

    ctx.on('breath_trigger_activated', (data: any) => {
      if (data.id === 'puzzle-brazier' && !this.brazierLit) {
        this.brazierLit = true
        this.igniteBrazier()
        this.checkGateConditions()
      }
    })

    ctx.on('break_wall', (data: any) => {
      if (data.id === 'secret-wall' && !this.secretWallBroken) {
        this.secretWallBroken = true
        this.destroySecretWall()
      }
    })

    ctx.on('dragon_sense_toggle', (data: any) => {
      const wall = ctx.scene.find('secret-wall')
      if (wall) {
        if (wall.object3D && wall.object3D.scale) {
          if (data.active) {
            wall.object3D.scale.set(0.65, 3.1, 2.6)
          } else {
            wall.object3D.scale.set(0.6, 3.0, 2.5)
          }
        }
      }
    })
  }

  private getPos(target: any) {
    if (!target) return { x: 0, y: 0, z: 0 }
    if (target.object3D && target.object3D.position) return target.object3D.position
    if (typeof target.getTransform === 'function') return target.getTransform().position
    if (target.entity && typeof target.entity.getTransform === 'function') return target.entity.getTransform().position
    return { x: 0, y: 0, z: 0 }
  }

  onUpdate(dt: number) {
    if (!this.platePressed) {
      const player = this.ctx.scene.find('player')
      const plate = this.ctx.scene.find('puzzle-plate')
      if (player && plate) {
        const pPos = this.getPos(player)
        const plPos = this.getPos(plate)
        const dx = pPos.x - plPos.x
        const dy = pPos.y - plPos.y
        const dz = pPos.z - plPos.z
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
        if (dist < 1.4) {
          this.platePressed = true
          if (plate.object3D) plate.object3D.position.y = -0.05
          if (typeof plate.getTransform === 'function') plate.getTransform().position.y = -0.05
          this.checkGateConditions()
        }
      }
    }

    if (this.gateOpen) {
      const gate = this.ctx.scene.find('gate-door')
      if (gate) {
        if (gate.object3D) {
          if (gate.object3D.position.y > -2.5) {
            gate.object3D.position.y -= dt * 2.5
          } else {
            gate.object3D.visible = false
          }
        }
        if (typeof gate.getTransform === 'function') {
          const t = gate.getTransform()
          if (t.position.y > -2.5) {
            t.position.y -= dt * 2.5
          }
        }
      }
    }
  }

  private animateLever() {
    const lever = this.ctx.scene.find('puzzle-lever')
    if (lever) {
      if (lever.object3D && lever.object3D.rotation) {
        lever.object3D.rotation.z = 0.5
      }
      if (typeof lever.getTransform === 'function') {
        lever.getTransform().rotation.z = 30
      }
    }
  }

  private igniteBrazier() {
    const brazier = this.ctx.scene.find('puzzle-brazier')
    if (brazier) {
      if (brazier.object3D && brazier.object3D.scale) {
        brazier.object3D.scale.set(0.7, 1.6, 0.7)
      }
    }
  }

  private checkGateConditions() {
    if (this.gateOpen) return

    let solvedCount = 0
    if (this.leverActivated) solvedCount++
    if (this.brazierLit) solvedCount++
    if (this.platePressed) solvedCount++

    if (this.ctx.ui) {
      const questEl = this.ctx.ui.query('#quest-desc')
      if (questEl) {
        questEl.textContent = 'Mekanisme Bulan: ' + solvedCount + ' / 3 Aktif'
      }
    }

    if (this.leverActivated && this.brazierLit && this.platePressed) {
      this.gateOpen = true
      if (this.ctx.ui) {
        const questEl = this.ctx.ui.query('#quest-desc')
        if (questEl) questEl.textContent = 'Gerbang Terbuka! Jelajahi Gua Kawah'
        const toast = this.ctx.ui.query('#toast-text')
        if (toast) toast.textContent = '✦ GERBANG KAWAH BULAN TERBUKA! ✦'
        this.ctx.ui.show('#toast-banner')
        setTimeout(() => {
          if (this.ctx.ui) this.ctx.ui.hide('#toast-banner')
        }, 3000)
      }
    }
  }

  private destroySecretWall() {
    const wall = this.ctx.scene.find('secret-wall')
    if (wall) {
      if (wall.object3D) {
        wall.object3D.visible = false
        wall.object3D.position.y = -10
      }
      if (typeof wall.getTransform === 'function') {
        wall.getTransform().position.y = -10
      }
    }
    if (this.ctx.ui) {
      const toast = this.ctx.ui.query('#toast-text')
      if (toast) toast.textContent = '✦ Dinding Retak Hancur! Jalan Rahasia Terbuka!'
      this.ctx.ui.show('#toast-banner')
      setTimeout(() => {
        if (this.ctx.ui) this.ctx.ui.hide('#toast-banner')
      }, 2500)
    }
  }
}

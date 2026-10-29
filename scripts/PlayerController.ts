
import { Vector3 } from 'three'

export default class PlayerController {
  hp = 6
  maxHp = 6
  breath = 100
  maxBreath = 100
  starCrystals = 0
  dragonSenseActive = false
  enemiesCleaned = 0
  isVictorious = false

  private ctx: any
  private isInvincible = false
  private invincibilityTimer = 0
  private attackCooldown = 0
  private comboStep = 0
  private comboTimer = 0
  private tailSpinTimer = 0
  private breathCooldown = 0
  private nearbyInteractable: any = null
  private dialogueOpen = false

  onInit(ctx: any) {
    this.ctx = ctx

    if (ctx.ui) {
      ctx.ui.bind('#star-count', () => this.starCrystals)
      ctx.ui.bind('#breath-fill', () => ({
        style: { width: Math.max(0, Math.min(100, this.breath)) + '%' }
      }))

      ctx.ui.on('#dialogue-close', 'click', () => {
        this.closeDialogue()
      })

      ctx.ui.on('#btn-restart', 'click', () => {
        ctx.scene.load('scenes/Main.lscene')
      })
    }

    ctx.on('crystal_collected', () => {
      this.starCrystals++
      this.showToast('+1 Kristal Bintang (' + this.starCrystals + '/5)')
    })

    ctx.on('heart_scale_collected', () => {
      this.maxHp = Math.min(8, this.maxHp + 2)
      this.hp = this.maxHp
      this.updateHeartsUI()
      this.showToast('✦ Kepingan Sisik Hati Didapat! HP Maksimal Bertambah!')
    })

    ctx.on('enemy_defeated', () => {
      this.enemiesCleaned++
      this.breath = Math.min(this.maxBreath, this.breath + 30)
    })

    ctx.on('moon_shard_claimed', () => {
      this.triggerVictory()
    })

    this.updateHeartsUI()
  }

  private getPos(target?: any) {
    const t = target || this.ctx
    if (!t) return { x: 0, y: 0, z: 0 }
    if (t.object3D && t.object3D.position) return t.object3D.position
    if (typeof t.getTransform === 'function') return t.getTransform().position
    if (t.entity && typeof t.entity.getTransform === 'function') return t.entity.getTransform().position
    return { x: 0, y: 0, z: 0 }
  }

  private getDistance(posA: any, posB: any) {
    const dx = posA.x - posB.x
    const dy = posA.y - posB.y
    const dz = posA.z - posB.z
    return Math.sqrt(dx * dx + dy * dy + dz * dz)
  }

  onUpdate(dt: number) {
    if (this.isVictorious) return

    if (this.breath < this.maxBreath) {
      this.breath = Math.min(this.maxBreath, this.breath + 18 * dt)
    }

    if (this.invincibilityTimer > 0) {
      this.invincibilityTimer -= dt
      if (this.invincibilityTimer <= 0) {
        this.isInvincible = false
        this.setVisualVisible(true)
      } else {
        const flash = Math.floor(this.invincibilityTimer * 15) % 2 === 0
        this.setVisualVisible(flash)
      }
    }

    if (this.attackCooldown > 0) this.attackCooldown -= dt
    if (this.breathCooldown > 0) this.breathCooldown -= dt
    if (this.comboTimer > 0) {
      this.comboTimer -= dt
      if (this.comboTimer <= 0) this.comboStep = 0
    }

    if (this.tailSpinTimer > 0) {
      this.tailSpinTimer -= dt
      const visual = this.getVisualObject()
      if (visual && visual.rotation) {
        visual.rotation.y += dt * 25
      }
    } else {
      const visual = this.getVisualObject()
      if (visual && visual.rotation && visual.rotation.y !== 0) {
        visual.rotation.y = 0
      }
    }

    this.handleCombatInputs()
    this.handleInteraction()
    this.checkNearbyInteractables()
  }

  private handleCombatInputs() {
    const input = this.ctx.input
    if (!input) return

    if (input.isActionJustPressed('Attack') && this.attackCooldown <= 0) {
      this.performClawAttack()
    }

    if (input.isActionJustPressed('HeavyAttack') && this.attackCooldown <= 0) {
      this.performTailSpin()
    }

    if (input.isActionJustPressed('Breath') && this.breathCooldown <= 0) {
      this.performDragonBreath()
    }

    if (input.isActionJustPressed('DragonSense')) {
      this.toggleDragonSense()
    }
  }

  private performClawAttack() {
    this.attackCooldown = 0.28
    this.comboStep = (this.comboStep % 3) + 1
    this.comboTimer = 0.8

    const visual = this.getVisualObject()
    if (visual && visual.scale) {
      visual.scale.set(1.1, 0.9, 1.2)
      setTimeout(() => {
        if (visual && visual.scale) visual.scale.set(1, 1, 1)
      }, 150)
    }

    const myPos = this.getPos()
    const enemies = this.ctx.scene.findByTag('Enemy')
    for (const enemy of enemies) {
      const ePos = this.getPos(enemy)
      const dist = this.getDistance(myPos, ePos)
      if (dist <= 2.2) {
        this.ctx.emit('player_hit_enemy', {
          targetId: enemy.id,
          damage: 1,
          knockback: { x: (ePos.x - myPos.x) * 2, y: 0, z: (ePos.z - myPos.z) * 2 }
        })
      }
    }

    const breakables = this.ctx.scene.findByTag('Breakable')
    for (const b of breakables) {
      const bPos = this.getPos(b)
      if (this.getDistance(myPos, bPos) < 2.5) {
        this.ctx.emit('break_wall', { id: b.id })
      }
    }
  }

  private performTailSpin() {
    this.attackCooldown = 0.6
    this.tailSpinTimer = 0.35

    const myPos = this.getPos()
    const enemies = this.ctx.scene.findByTag('Enemy')
    for (const enemy of enemies) {
      const ePos = this.getPos(enemy)
      const dist = this.getDistance(myPos, ePos)
      if (dist <= 2.8) {
        this.ctx.emit('player_hit_enemy', {
          targetId: enemy.id,
          damage: 2,
          knockback: { x: (ePos.x - myPos.x) * 3.5, y: 0, z: (ePos.z - myPos.z) * 3.5 }
        })
      }
    }

    const levers = this.ctx.scene.findByTag('TailTrigger')
    for (const lever of levers) {
      const lPos = this.getPos(lever)
      if (this.getDistance(myPos, lPos) < 2.8) {
        this.ctx.emit('tail_trigger_activated', { id: lever.id })
      }
    }
  }

  private performDragonBreath() {
    if (this.breath < 30) {
      this.showToast('Napas Naga Belum Cukup!')
      return
    }

    this.breath -= 30
    this.breathCooldown = 0.5

    const myPos = this.getPos()
    const enemies = this.ctx.scene.findByTag('Enemy')
    for (const enemy of enemies) {
      const ePos = this.getPos(enemy)
      const dist = this.getDistance(myPos, ePos)
      if (dist <= 6.5) {
        this.ctx.emit('player_hit_enemy', {
          targetId: enemy.id,
          damage: 3,
          knockback: { x: (ePos.x - myPos.x) * 2, y: 0, z: (ePos.z - myPos.z) * 2 }
        })
      }
    }

    const braziers = this.ctx.scene.findByTag('BreathTrigger')
    for (const brazier of braziers) {
      const bPos = this.getPos(brazier)
      if (this.getDistance(myPos, bPos) < 6.0) {
        this.ctx.emit('breath_trigger_activated', { id: brazier.id })
      }
    }

    this.showToast('✦ Semburan Napas Bulan!')
  }

  private toggleDragonSense() {
    this.dragonSenseActive = !this.dragonSenseActive
    if (this.ctx.ui) {
      if (this.dragonSenseActive) {
        this.ctx.ui.show('#dragon-sense-overlay')
        this.showToast('Indra Naga Aktif: Objek rahasia terlihat!')
      } else {
        this.ctx.ui.hide('#dragon-sense-overlay')
      }
    }
    this.ctx.emit('dragon_sense_toggle', { active: this.dragonSenseActive })
  }

  private checkNearbyInteractables() {
    const myPos = this.getPos()
    let found: any = null
    let promptText = ''

    const pip = this.ctx.scene.find('npc-pip')
    if (pip) {
      const pPos = this.getPos(pip)
      if (this.getDistance(myPos, pPos) < 2.4) {
        found = pip
        promptText = 'Bicara dengan Pip'
      }
    }

    const shard = this.ctx.scene.find('moon-shard')
    if (shard) {
      const sPos = this.getPos(shard)
      if (this.getDistance(myPos, sPos) < 2.5) {
        found = shard
        promptText = 'Pulihkan Pecahan Bulan'
      }
    }

    this.nearbyInteractable = found
    if (this.ctx.ui) {
      if (found && !this.dialogueOpen) {
        const textEl = this.ctx.ui.query('#interact-text')
        if (textEl) textEl.textContent = promptText
        this.ctx.ui.show('#interact-prompt')
      } else {
        this.ctx.ui.hide('#interact-prompt')
      }
    }
  }

  private handleInteraction() {
    if (!this.ctx.input) return
    if (this.ctx.input.isActionJustPressed('Interact')) {
      if (this.dialogueOpen) {
        this.closeDialogue()
        return
      }

      if (this.nearbyInteractable) {
        if (this.nearbyInteractable.id === 'npc-pip') {
          this.openDialogue()
        } else if (this.nearbyInteractable.id === 'moon-shard') {
          this.triggerVictory()
        }
      }
    }
  }

  private openDialogue() {
    this.dialogueOpen = true
    if (this.ctx.ui) {
      this.ctx.ui.hide('#interact-prompt')
      this.ctx.ui.show('#dialogue-box')
    }
  }

  private closeDialogue() {
    this.dialogueOpen = false
    if (this.ctx.ui) {
      this.ctx.ui.hide('#dialogue-box')
    }
  }

  takeDamage(amount: number) {
    if (this.isInvincible || this.isVictorious) return

    this.hp = Math.max(0, this.hp - amount)
    this.isInvincible = true
    this.invincibilityTimer = 0.8
    this.updateHeartsUI()
    this.showToast('Moon terkena serangan! (-' + amount + ' HP)')

    if (this.hp <= 0) {
      this.handleDeath()
    }
  }

  private handleDeath() {
    this.showToast('Moon pingsan! Memulihkan diri di kuil...')
    setTimeout(() => {
      this.hp = this.maxHp
      this.updateHeartsUI()
      const t = this.ctx.entity ? this.ctx.entity.getTransform() : null
      if (t) {
        t.position.x = 0
        t.position.y = 0.1
        t.position.z = 12
      }
      if (this.ctx.object3D) {
        this.ctx.object3D.position.set(0, 0.1, 12)
      }
      this.isInvincible = false
    }, 1200)
  }

  private updateHeartsUI() {
    if (!this.ctx.ui) return
    const heartsRow = this.ctx.ui.query('#hearts-row')
    if (!heartsRow) return

    let html = ''
    const totalHearts = Math.ceil(this.maxHp / 2)
    for (let i = 0; i < totalHearts; i++) {
      const heartHp = this.hp - (i * 2)
      if (heartHp >= 2) {
        html += '<span class="heart full">❤</span>'
      } else if (heartHp === 1) {
        html += '<span class="heart half" style="color: #f87171;">💔</span>'
      } else {
        html += '<span class="heart empty">🖤</span>'
      }
    }
    heartsRow.innerHTML = html
  }

  private showToast(msg: string) {
    if (!this.ctx.ui) return
    const el = this.ctx.ui.query('#toast-text')
    if (el) el.textContent = msg
    this.ctx.ui.show('#toast-banner')
    setTimeout(() => {
      if (this.ctx.ui) this.ctx.ui.hide('#toast-banner')
    }, 2500)
  }

  private triggerVictory() {
    if (this.isVictorious) return
    this.isVictorious = true

    if (this.ctx.ui) {
      const crysEl = this.ctx.ui.query('#vstat-crystals')
      if (crysEl) crysEl.textContent = this.starCrystals + '/5'
      const enEl = this.ctx.ui.query('#vstat-enemies')
      if (enEl) enEl.textContent = String(this.enemiesCleaned)
      this.ctx.ui.show('#victory-modal')
    }
  }

  private getVisualObject() {
    const visual = this.ctx.scene.find('player-visual')
    return visual ? (visual.object3D || visual) : null
  }

  private setVisualVisible(visible: boolean) {
    const visual = this.getVisualObject()
    if (visual) visual.visible = visible
  }
}

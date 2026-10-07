// Keyboard + pointer + wheel input, collected into per-frame state.
// Pointer listeners live on the play surface so UI panels keep their clicks.

export class Input {
  readonly keys = new Set<string>();
  private pressed = new Set<string>();
  pointer = { x: 0, y: 0, down: false, right: false, active: false, touch: false };
  wheel = 0;
  private rightClicks = 0;
  private cleanup: Array<() => void> = [];

  constructor(private surface: HTMLElement) {}

  attach() {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const code = e.code;
      if (['Tab', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(code)) e.preventDefault();
      if (!e.repeat) this.pressed.add(code);
      this.keys.add(code);
    };
    const onKeyUp = (e: KeyboardEvent) => this.keys.delete(e.code);
    const onBlur = () => {
      this.keys.clear();
      this.pointer.down = false;
      this.pointer.right = false;
    };
    const rect = () => this.surface.getBoundingClientRect();
    const onPointerDown = (e: PointerEvent) => {
      const r = rect();
      this.pointer.x = e.clientX - r.left;
      this.pointer.y = e.clientY - r.top;
      this.pointer.active = true;
      this.pointer.touch = e.pointerType === 'touch';
      if (e.button === 2) {
        this.pointer.right = true;
        this.rightClicks++;
      } else if (e.button === 0) {
        this.pointer.down = true;
      }
      this.surface.setPointerCapture?.(e.pointerId);
    };
    const onPointerMove = (e: PointerEvent) => {
      const r = rect();
      this.pointer.x = e.clientX - r.left;
      this.pointer.y = e.clientY - r.top;
      this.pointer.active = true;
    };
    const onPointerUp = (e: PointerEvent) => {
      if (e.button === 2) this.pointer.right = false;
      else this.pointer.down = false;
      if (this.surface.hasPointerCapture?.(e.pointerId)) this.surface.releasePointerCapture(e.pointerId);
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      this.wheel += Math.sign(e.deltaY);
    };
    const onContext = (e: Event) => e.preventDefault();

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    this.surface.addEventListener('pointerdown', onPointerDown);
    this.surface.addEventListener('pointermove', onPointerMove);
    this.surface.addEventListener('pointerup', onPointerUp);
    this.surface.addEventListener('pointercancel', onPointerUp);
    this.surface.addEventListener('wheel', onWheel, { passive: false });
    this.surface.addEventListener('contextmenu', onContext);
    this.cleanup = [
      () => window.removeEventListener('keydown', onKeyDown),
      () => window.removeEventListener('keyup', onKeyUp),
      () => window.removeEventListener('blur', onBlur),
      () => this.surface.removeEventListener('pointerdown', onPointerDown),
      () => this.surface.removeEventListener('pointermove', onPointerMove),
      () => this.surface.removeEventListener('pointerup', onPointerUp),
      () => this.surface.removeEventListener('pointercancel', onPointerUp),
      () => this.surface.removeEventListener('wheel', onWheel),
      () => this.surface.removeEventListener('contextmenu', onContext),
    ];
  }

  detach() {
    for (const off of this.cleanup) off();
    this.cleanup = [];
  }

  // Edge-triggered presses since the last call.
  consume(): Set<string> {
    const out = this.pressed;
    this.pressed = new Set();
    return out;
  }

  consumeRightClicks() {
    const n = this.rightClicks;
    this.rightClicks = 0;
    return n;
  }

  consumeWheel() {
    const w = this.wheel;
    this.wheel = 0;
    return w;
  }

  // Simulate a key press from on-screen controls.
  tap(code: string) {
    this.pressed.add(code);
  }

  clear() {
    this.keys.clear();
    this.pressed.clear();
    this.pointer.down = false;
    this.pointer.right = false;
  }
}

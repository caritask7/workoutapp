/** Signal de fin de repos : bip court (Web Audio) et/ou vibration, selon les préférences. */
let ctx: AudioContext | null = null;

export function restFinishedAlert({ sound, vibration }: { sound: boolean; vibration: boolean }) {
  if (vibration && typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate([180, 90, 180]);
  }
  if (!sound || typeof window === "undefined") return;
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx ??= new AC();
    const now = ctx.currentTime;
    [0, 0.22].forEach((offset) => {
      const osc = ctx!.createOscillator();
      const gain = ctx!.createGain();
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.25, now + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.16);
      osc.connect(gain).connect(ctx!.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.18);
    });
  } catch {
    // Audio indisponible (politique d'autoplay) : la vibration et l'affichage suffisent.
  }
}

/** Débloque l'audio sur iOS / Safari : à appeler lors d'une interaction utilisateur. */
export function primeAudio() {
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx ??= new AC();
    if (ctx.state === "suspended") void ctx.resume();
  } catch {
    /* ignoré */
  }
}

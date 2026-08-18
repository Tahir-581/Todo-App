/** Repeating short beeps until `stop()` is called. */
export function startReminderAlarm(): () => void {
  let ctx: AudioContext | null = null;
  let intervalId: ReturnType<typeof setInterval> | null = null;
  try {
    ctx = new AudioContext();
    const beep = () => {
      if (!ctx) return;
      const now = ctx.currentTime;
      // Dual-tone buzzer effect
      [{ f: 440, type: "sawtooth" as OscillatorType }, { f: 880, type: "sine" as OscillatorType }].forEach(({ f, type }) => {
        const o = ctx!.createOscillator();
        const g = ctx!.createGain();
        o.type = type;
        o.frequency.setValueAtTime(f, now);
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(0.1, now + 0.05);
        g.gain.linearRampToValueAtTime(0, now + 0.3);
        o.connect(g);
        g.connect(ctx!.destination);
        o.start(now);
        o.stop(now + 0.4);
      });
    };
    beep();
    intervalId = setInterval(beep, 800);
  } catch {
    /* autoplay / AudioContext may fail */
  }
  return () => {
    if (intervalId != null) clearInterval(intervalId);
    intervalId = null;
    if (ctx) {
      void ctx.close();
      ctx = null;
    }
  };
}

// Test-only: record every Web Audio GainNode the app creates, so the check can read the real output volumes.
window.__gains = [];
const orig = AudioContext.prototype.createGain;
AudioContext.prototype.createGain = function () { const g = orig.call(this); window.__gains.push(g); return g; };

/**
 * Sample Retinal Images Generator & Presets
 * Generates clinical-grade synthetic fundus images as data URLs
 * for instant testing without requiring external file downloads.
 */

export interface SampleRetinalImage {
  id: string;
  name: string;
  eye: 'OD' | 'OS'; // Right Eye (OD) or Left Eye (OS)
  presetGrade: 'no_dr' | 'moderate' | 'poor_quality';
  description: string;
  quality: 'Optimal' | 'Insufficient';
  dataUrl: string;
}

/**
 * Creates high-resolution canvas fundus image as Data URL
 */
export function generateSyntheticFundus(type: 'normal' | 'moderate_dr' | 'blurry_poor'): string {
  if (typeof document === 'undefined') return '';

  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 640;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const cx = 320;
  const cy = 320;
  const radius = 290;

  // Black background
  ctx.fillStyle = '#05070a';
  ctx.fillRect(0, 0, 640, 640);

  // Aperture clipping (circular fundus mask)
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();

  if (type === 'blurry_poor') {
    // Severely underexposed and low contrast
    const darkGrad = ctx.createRadialGradient(cx, cy, 20, cx, cy, radius);
    darkGrad.addColorStop(0, '#3a1f18');
    darkGrad.addColorStop(0.5, '#200f0c');
    darkGrad.addColorStop(1, '#0c0706');
    ctx.fillStyle = darkGrad;
    ctx.fillRect(0, 0, 640, 640);

    // Smudged disc
    ctx.filter = 'blur(16px)';
    ctx.fillStyle = '#6e4533';
    ctx.beginPath();
    ctx.arc(230, 310, 45, 0, Math.PI * 2);
    ctx.fill();

    // Heavy blur artifacts simulating dirty lens / cataract / motion
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.fillRect(0, 0, 640, 640);
    ctx.filter = 'none';
    ctx.restore();
    return canvas.toDataURL('image/jpeg', 0.85);
  }

  // Normal or Moderate DR: Rich retinal background
  const bgGrad = ctx.createRadialGradient(cx + 20, cy, 30, cx, cy, radius);
  bgGrad.addColorStop(0, '#d16c3b');
  bgGrad.addColorStop(0.25, '#b94e22');
  bgGrad.addColorStop(0.65, '#682015');
  bgGrad.addColorStop(0.9, '#300b08');
  bgGrad.addColorStop(1, '#110303');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 640, 640);

  // Optic Disc (Nasal side)
  const discX = 220;
  const discY = 320;
  const discGrad = ctx.createRadialGradient(discX, discY, 5, discX, discY, 40);
  discGrad.addColorStop(0, '#fbe4c7');
  discGrad.addColorStop(0.6, '#f3b88b');
  discGrad.addColorStop(1, '#cb704a');
  ctx.fillStyle = discGrad;
  ctx.beginPath();
  ctx.ellipse(discX, discY, 34, 40, 0, 0, Math.PI * 2);
  ctx.fill();

  // Macula (Darker temporal region)
  const maculaX = 410;
  const maculaY = 330;
  const maculaGrad = ctx.createRadialGradient(maculaX, maculaY, 5, maculaX, maculaY, 60);
  maculaGrad.addColorStop(0, '#4e140b');
  maculaGrad.addColorStop(0.5, '#762215');
  maculaGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = maculaGrad;
  ctx.beginPath();
  ctx.arc(maculaX, maculaY, 60, 0, Math.PI * 2);
  ctx.fill();

  // Fovea centralis bright reflex
  ctx.fillStyle = 'rgba(255, 215, 170, 0.45)';
  ctx.beginPath();
  ctx.arc(maculaX, maculaY, 3, 0, Math.PI * 2);
  ctx.fill();

  // Draw branching vascular arcades
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#5a120b';

  // Superior arcade
  ctx.beginPath();
  ctx.moveTo(discX, discY - 10);
  ctx.bezierCurveTo(discX + 20, discY - 90, discX + 90, discY - 160, discX + 180, discY - 140);
  ctx.stroke();

  // Inferior arcade
  ctx.beginPath();
  ctx.moveTo(discX, discY + 10);
  ctx.bezierCurveTo(discX + 25, discY + 90, discX + 95, discY + 160, discX + 185, discY + 140);
  ctx.stroke();

  // Secondary branches
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = '#7c1c12';
  ctx.beginPath();
  ctx.moveTo(discX + 90, discY - 160);
  ctx.quadraticCurveTo(discX + 150, discY - 200, discX + 210, discY - 190);
  ctx.moveTo(discX + 95, discY + 160);
  ctx.quadraticCurveTo(discX + 155, discY + 200, discX + 215, discY + 190);
  ctx.stroke();

  // If Moderate DR, add microaneurysms, hemorrhages, and hard exudates
  if (type === 'moderate_dr') {
    // Hemorrhages (dark red flame/blot spots)
    ctx.fillStyle = '#4a0808';
    [
      { x: 380, y: 270, rx: 9, ry: 5, rot: 0.4 },
      { x: 350, y: 390, rx: 7, ry: 8, rot: 0.1 },
      { x: 440, y: 250, rx: 11, ry: 6, rot: -0.3 },
      { x: 460, y: 360, rx: 8, ry: 5, rot: 0.6 },
      { x: 300, y: 230, rx: 6, ry: 9, rot: 0.2 },
    ].forEach(h => {
      ctx.beginPath();
      ctx.ellipse(h.x, h.y, h.rx, h.ry, h.rot, 0, Math.PI * 2);
      ctx.fill();
    });

    // Microaneurysms (small sharp red dots)
    ctx.fillStyle = '#7a0505';
    [
      { x: 370, y: 310, r: 2.8 },
      { x: 395, y: 285, r: 3.2 },
      { x: 430, y: 320, r: 2.5 },
      { x: 340, y: 350, r: 3.0 },
      { x: 450, y: 380, r: 2.8 },
      { x: 470, y: 330, r: 3.4 },
      { x: 360, y: 250, r: 2.6 },
    ].forEach(m => {
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
      ctx.fill();
    });

    // Hard exudates (waxy yellowish lipid deposits)
    ctx.fillStyle = '#eed674';
    [
      { x: 455, y: 305, r: 3.5 },
      { x: 462, y: 310, r: 2.8 },
      { x: 458, y: 318, r: 3.2 },
      { x: 448, y: 312, r: 2.4 },
    ].forEach(e => {
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // Vignette & peripheral shadow
  const vignette = ctx.createRadialGradient(cx, cy, radius * 0.75, cx, cy, radius);
  vignette.addColorStop(0, 'transparent');
  vignette.addColorStop(1, 'rgba(0, 0, 0, 0.7)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, 640, 640);

  ctx.restore();
  return canvas.toDataURL('image/jpeg', 0.9);
}

/**
 * Returns available sample retinal images for one-click testing
 */
export function getSampleRetinalImages(): SampleRetinalImage[] {
  return [
    {
      id: 'sample_normal',
      name: 'Sample OD (Right Eye - Clear Normal)',
      eye: 'OD',
      presetGrade: 'no_dr',
      description: 'Clear fundus view with sharp optic disc and no microaneurysms.',
      quality: 'Optimal',
      dataUrl: generateSyntheticFundus('normal')
    },
    {
      id: 'sample_moderate',
      name: 'Sample OS (Left Eye - Moderate NPDR)',
      eye: 'OS',
      presetGrade: 'moderate',
      description: 'Diagnostic fundus with microaneurysms and intraretinal hemorrhages.',
      quality: 'Optimal',
      dataUrl: generateSyntheticFundus('moderate_dr')
    },
    {
      id: 'sample_poor_quality',
      name: 'Sample Poor Quality (Blurry / Underexposed)',
      eye: 'OD',
      presetGrade: 'poor_quality',
      description: 'Insufficient focus and illumination for diagnostic screening validation.',
      quality: 'Insufficient',
      dataUrl: generateSyntheticFundus('blurry_poor')
    }
  ];
}

function smooth(values, radius) {
  const copy = values.slice();
  for (let i = 0; i < values.length; i++) {
    let sum = 0;
    let count = 0;
    for (let j = Math.max(0, i - radius); j <= Math.min(values.length - 1, i + radius); j++) {
      sum += copy[j];
      count++;
    }
    values[i] = sum / count;
  }
}

// Renders the signature layer to a canvas and follows its strokes left to
// right, so the pen rides the ink instead of sliding along a flat line.
// Returns the layer's viewport box plus the pen's y for every x column.
export function tracePen(layer) {
  const rect = layer.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width));
  const height = Math.max(1, Math.round(rect.height));
  const flat = {
    left: rect.left,
    top: rect.top,
    width,
    height,
    start: 0,
    end: width,
    ys: new Float32Array(width).fill(height / 2)
  };

  try {
    const style = getComputedStyle(layer);
    const size = parseFloat(style.fontSize);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.font = `${style.fontStyle} ${style.fontWeight} ${size}px ${style.fontFamily}`;
    ctx.textBaseline = "alphabetic";

    // Measure where the browser really puts the baseline: engines disagree on
    // this font's vertical metrics, so computing it from canvas metrics can
    // leave the pen floating above the ink (Firefox).
    const text = layer.textContent;
    const probe = document.createElement("span");
    probe.style.cssText = "display:inline-block;width:0;height:0;vertical-align:baseline";
    layer.appendChild(probe);
    const baseline = probe.getBoundingClientRect().top - rect.top;
    layer.removeChild(probe);
    ctx.fillText(text, parseFloat(style.paddingLeft), baseline);

    const pixels = ctx.getImageData(0, 0, width, height).data;
    const ys = new Float32Array(width);
    let previous = -1;
    let first = -1;
    let last = -1;

    // Every second column and row is plenty once the path is smoothed, and
    // keeps this to a few milliseconds.
    const STEP = 2;
    for (let x = 0; x < width; x += STEP) {
      let best = -1;
      let bestDistance = Infinity;
      let runStart = -1;
      // Runs one step past the bottom so a stroke touching it still closes.
      for (let y = 0; y < height + STEP; y += STEP) {
        const inked = y < height && pixels[(y * width + x) * 4 + 3] > 80;
        if (inked) {
          if (runStart < 0) runStart = y;
        } else if (runStart >= 0) {
          // Of the strokes crossing this column, stay on the one nearest the pen.
          const centre = (runStart + y - STEP) / 2;
          const distance = Math.abs(centre - (previous < 0 ? height / 2 : previous));
          if (distance < bestDistance) {
            bestDistance = distance;
            best = centre;
          }
          runStart = -1;
        }
      }
      if (best >= 0) {
        previous = best;
        if (first < 0) first = x;
        last = x;
      }
      for (let fill = x; fill < Math.min(width, x + STEP); fill++) ys[fill] = previous;
    }

    if (first < 0) return flat;
    for (let x = 0; x < first; x++) ys[x] = ys[first];
    const radius = Math.max(2, Math.round(size * 0.06));
    smooth(ys, radius);
    smooth(ys, radius);

    return {
      left: rect.left,
      top: rect.top,
      width,
      height,
      start: first,
      end: Math.min(width, last + width * 0.03 + 2),
      ys
    };
  } catch (error) {
    return flat;
  }
}

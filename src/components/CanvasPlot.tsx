import { onMount, createEffect, onCleanup } from 'solid-js';

type CanvasPlotProps = {
  width: number;
  height: number;
  run: (ctx: CanvasRenderingContext2D, width: number, height: number) => void;
  class?: string;
};

export default function CanvasPlot(props: CanvasPlotProps) {
  let canvasRef: HTMLCanvasElement | undefined;

  const render = () => {
    const canvas = canvasRef;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // High-DPI Scaling
    const dpr = window.devicePixelRatio || 1;

    // Set internal buffer size to match physical pixels
    canvas.width = props.width * dpr;
    canvas.height = props.height * dpr;

    // Reset transform to avoid accumulating scales if this runs multiple times
    ctx.resetTransform();

    // Scale coordinate system so 1 unit = 1 CSS pixel
    ctx.scale(dpr, dpr);

    // Clear and draw
    ctx.clearRect(0, 0, props.width, props.height);

    // Safe guard drawing
    ctx.save();
    props.run(ctx, props.width, props.height);
    ctx.restore();
  };

  createEffect(() => {
    // Re-run whenever props change
    // Access props.run, props.width, props.height to subscribe
    props.run; props.width; props.height;
    render();
  });

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: `${props.width}px`,
        height: `${props.height}px`,
      }}
      class={props.class}
    />
  );
}

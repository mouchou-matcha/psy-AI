import React, { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  analyserNode: AnalyserNode | null;
  isActive: boolean;
}

export function AudioVisualizer({ analyserNode, isActive }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();

  useEffect(() => {
    if (!analyserNode || !isActive || !canvasRef.current) {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
      // Clear canvas when inactive
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          // Draw flat line
          ctx.beginPath();
          ctx.moveTo(0, canvasRef.current.height / 2);
          ctx.lineTo(canvasRef.current.width, canvasRef.current.height / 2);
          ctx.lineWidth = 2;
          ctx.strokeStyle = '#0f766e'; // teal-700
          ctx.stroke();
        }
      }
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dataArray = new Uint8Array(analyserNode.frequencyBinCount);

    const draw = () => {
      analyserNode.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / dataArray.length) * 2.5;
      let x = 0;

      // Calculate average volume for a smoother effect
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const average = sum / dataArray.length;
      
      // Draw a smooth wave based on frequency
      ctx.beginPath();
      ctx.moveTo(0, canvas.height / 2);
      
      for (let i = 0; i < dataArray.length; i++) {
        const v = dataArray[i] / 255.0; // 0 to 1
        // Create a wave effect centered vertically
        const y = (canvas.height / 2) + (Math.sin(i * 0.5) * v * (canvas.height / 2));

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        x += barWidth;
      }

      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#14b8a6'; // teal-500
      ctx.stroke();

      // Also draw a few bars in the center based on average volume
      const numBars = 5;
      const barSpacing = 4;
      const centerBarWidth = 4;
      const startX = (canvas.width - (numBars * centerBarWidth + (numBars - 1) * barSpacing)) / 2;
      
      for (let i = 0; i < numBars; i++) {
        // Vary height slightly for each bar
        const heightMultiplier = i === 2 ? 1 : (i === 1 || i === 3) ? 0.7 : 0.4;
        const barHeight = Math.max(2, (average / 255.0) * canvas.height * heightMultiplier);
        
        ctx.fillStyle = '#2dd4bf'; // teal-400
        ctx.beginPath();
        ctx.roundRect(
          startX + i * (centerBarWidth + barSpacing), 
          (canvas.height - barHeight) / 2, 
          centerBarWidth, 
          barHeight,
          2
        );
        ctx.fill();
      }

      requestRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [analyserNode, isActive]);

  return (
    <div className={`h-12 w-full flex items-center justify-center transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-50'}`}>
      <canvas ref={canvasRef} width={200} height={40} className="w-full max-w-[200px]" />
    </div>
  );
}

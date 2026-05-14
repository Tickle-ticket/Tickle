'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import checkedAnimation from '@/src/shared/lottle/Checked.json';
import { useTargetTracker } from '@/src/shared/tracking/useTargetTracker';

const Lottie = dynamic(() => import('lottie-react'), { ssr: false });

export interface CustomCAPTCHAProps {
  onSuccess: (token: string) => void;
  onClose?: () => void;
}

export const CustomCAPTCHA = ({ onSuccess, onClose }: CustomCAPTCHAProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [keypad, setKeypad] = useState<number[]>([]);
  const [targetSequence, setTargetSequence] = useState<number[]>([]);
  const [currentInput, setCurrentInput] = useState<number[]>([]);
  const [isSuccess, setIsSuccess] = useState(false);
  const [hoveredKey, setHoveredKey] = useState<number | 'delete' | null>(null);

  const isError = currentInput.some((num, idx) => num !== targetSequence[idx]);

  const generateMission = useCallback(() => {
    const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5);
    setKeypad(nums);

    const availableMissions = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5);
    setTargetSequence(availableMissions.slice(0, 3));
    setCurrentInput([]);
    setIsSuccess(false);
  }, []);

  useEffect(() => {
    generateMission();
  }, [generateMission]);

  useEffect(() => {
    if (isSuccess) {
      const timer = setTimeout(() => {
        onSuccess(`custom-captcha-token-${Date.now()}`);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isSuccess, onSuccess]);

  // Layout constants
  const CANVAS_W = 320;
  const CANVAS_H = 560;
  const PAD_X = 24;
  const GRID_Y = 215;
  const BTN_SIZE = 78;
  const GAP = 19;

  // Draw loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set resolution for retina displays
    const dpr = window.devicePixelRatio || 1;
    canvas.width = CANVAS_W * dpr;
    canvas.height = CANVAS_H * dpr;
    canvas.style.width = `${CANVAS_W}px`;
    canvas.style.height = `${CANVAS_H}px`;
    ctx.scale(dpr, dpr);

    // Clear
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    // Title
    ctx.font = 'bold 20px sans-serif';
    ctx.fillStyle = isError ? '#dc2626' : '#111827';
    ctx.textAlign = 'center';
    ctx.fillText(isSuccess ? '인증 완료' : isError ? '잘못된 입력입니다' : '보안 인증', CANVAS_W / 2, 30);

    // Instruction Box
    ctx.fillStyle = '#f9fafb';
    ctx.beginPath();
    ctx.roundRect(PAD_X, 50, CANVAS_W - PAD_X * 2, 145, 12);
    ctx.fill();
    ctx.strokeStyle = '#f3f4f6';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.font = 'bold 16px sans-serif';
    ctx.fillStyle = '#1f2937';
    ctx.fillText('다음 숫자를 순서대로 누르세요', CANVAS_W / 2, 80);

    // Target sequence boxes
    const boxW = 64;
    const boxGap = 28;
    const startX = CANVAS_W / 2 - boxW - boxGap;
    
    targetSequence.forEach((num, idx) => {
      const isCompleted = currentInput.length > idx && currentInput[idx] === num;
      const isWrongSpot = currentInput.length > idx && currentInput[idx] !== num;

      const x = startX + idx * (boxW + boxGap);
      const y = 102;

      ctx.beginPath();
      ctx.roundRect(x - boxW/2, y, boxW, boxW, 12);
      
      if (isCompleted) {
        ctx.fillStyle = '#3b82f6';
        ctx.fill();
        ctx.fillStyle = '#ffffff';
      } else if (isWrongSpot) {
        ctx.fillStyle = '#ef4444';
        ctx.fill();
        ctx.fillStyle = '#ffffff';
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.strokeStyle = '#d1d5db';
        ctx.stroke();
        ctx.fillStyle = '#2563eb';
      }

      ctx.font = 'bold 30px sans-serif';
      ctx.fillText(num.toString(), x, y + 42);

      // Draw arrow
      if (idx < 2) {
        ctx.fillStyle = '#cbd5e1';
        ctx.font = 'bold 18px sans-serif';
        ctx.fillText('➡', x + boxW/2 + boxGap/2, y + 36);
      }
    });

    // Progress bar
    const progress = targetSequence.length > 0 ? (currentInput.length / targetSequence.length) * 100 : 0;
    ctx.fillStyle = '#e5e7eb';
    ctx.beginPath();
    ctx.roundRect(PAD_X * 2, 178, CANVAS_W - PAD_X * 4, 6, 3);
    ctx.fill();

    if (progress > 0) {
      ctx.fillStyle = isError ? '#ef4444' : '#3b82f6';
      ctx.beginPath();
      ctx.roundRect(PAD_X * 2, 178, (CANVAS_W - PAD_X * 4) * (progress / 100), 6, 3);
      ctx.fill();
    }

    // Keypad
    keypad.forEach((num, idx) => {
      const row = Math.floor(idx / 3);
      const col = idx % 3;
      const x = PAD_X + col * (BTN_SIZE + GAP);
      const y = GRID_Y + row * (BTN_SIZE + GAP);

      const isPressed = currentInput.includes(num);
      const isHovered = hoveredKey === num && !isPressed && !isSuccess && !isError;

      ctx.beginPath();
      ctx.roundRect(x, y, BTN_SIZE, BTN_SIZE, 12);

      if (isPressed) {
        ctx.fillStyle = '#eff6ff';
        ctx.fill();
      } else if (isHovered) {
        ctx.fillStyle = '#eff6ff';
        ctx.fill();
        ctx.strokeStyle = '#bfdbfe';
        ctx.stroke();
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.strokeStyle = '#e5e7eb';
        ctx.stroke();
      }

      ctx.font = 'bold 24px sans-serif';
      ctx.fillStyle = isPressed ? '#93c5fd' : '#374151';
      ctx.fillText(num.toString(), x + BTN_SIZE / 2, y + BTN_SIZE / 2 + 8);
    });

    // Delete Button
    const delY = GRID_Y + 3 * (BTN_SIZE + GAP);
    const delW = CANVAS_W - PAD_X * 2;
    const delH = 48;
    const isDelHovered = hoveredKey === 'delete' && !isSuccess && currentInput.length > 0;
    const isDelDisabled = isSuccess || currentInput.length === 0;

    ctx.beginPath();
    ctx.roundRect(PAD_X, delY, delW, delH, 12);
    ctx.fillStyle = isDelDisabled ? '#f3f4f6' : (isDelHovered ? '#e5e7eb' : '#f3f4f6');
    ctx.fill();

    // Delete icon (SVG-like drawing)
    const iconX = CANVAS_W / 2 - 25; // Base offset for icon
    
    ctx.strokeStyle = isDelDisabled ? '#9ca3af' : (isDelHovered ? '#111827' : '#4b5563');
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(iconX - 20, delY + 24);
    ctx.lineTo(iconX - 10, delY + 16);
    ctx.lineTo(iconX + 2, delY + 16);
    ctx.arc(iconX + 4, delY + 18, 2, 1.5 * Math.PI, 2 * Math.PI);
    ctx.lineTo(iconX + 6, delY + 30);
    ctx.arc(iconX + 4, delY + 30, 2, 0, 0.5 * Math.PI);
    ctx.lineTo(iconX - 10, delY + 32);
    ctx.closePath();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(iconX - 6, delY + 20);
    ctx.lineTo(iconX, delY + 28);
    ctx.moveTo(iconX, delY + 20);
    ctx.lineTo(iconX - 6, delY + 28);
    ctx.stroke();

    ctx.font = 'bold 16px sans-serif';
    ctx.fillStyle = isDelDisabled ? '#9ca3af' : (isDelHovered ? '#111827' : '#4b5563');
    ctx.fillText('지우기', CANVAS_W / 2 + 18, delY + 30);

  }, [keypad, targetSequence, currentInput, isSuccess, isError, hoveredKey]);

  const getEventPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }
    // Account for CSS transform scale
    const scaleX = CANVAS_W / rect.width;
    const scaleY = CANVAS_H / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    const pos = getEventPos(e);
    if (!pos) return;
    const { x, y } = pos;

    if (isSuccess || isError || currentInput.length >= targetSequence.length) {
      if (isError) {
        const delY = GRID_Y + 3 * (BTN_SIZE + GAP);
        if (y >= delY && y <= delY + 48 && x >= PAD_X && x <= CANVAS_W - PAD_X) {
          setCurrentInput((prev) => prev.slice(0, -1));
        }
      }
      return;
    }

    for (let idx = 0; idx < 9; idx++) {
      const row = Math.floor(idx / 3);
      const col = idx % 3;
      const bx = PAD_X + col * (BTN_SIZE + GAP);
      const by = GRID_Y + row * (BTN_SIZE + GAP);

      if (x >= bx && x <= bx + BTN_SIZE && y >= by && y <= by + BTN_SIZE) {
        const num = keypad[idx];
        if (!currentInput.includes(num)) {
          const nextInput = [...currentInput, num];
          setCurrentInput(nextInput);
          if (nextInput.length === targetSequence.length) {
            const isWrong = nextInput.some((val, i) => val !== targetSequence[i]);
            if (!isWrong) setIsSuccess(true);
          }
        }
        return;
      }
    }

    const delY = GRID_Y + 3 * (BTN_SIZE + GAP);
    if (y >= delY && y <= delY + 48 && x >= PAD_X && x <= CANVAS_W - PAD_X) {
      if (currentInput.length > 0) {
        setCurrentInput((prev) => prev.slice(0, -1));
      }
    }
  };

  const handlePointerMove = (e: React.MouseEvent) => {
    const pos = getEventPos(e);
    if (!pos) return;
    const { x, y } = pos;

    let found: number | 'delete' | null = null;
    
    for (let idx = 0; idx < 9; idx++) {
      const row = Math.floor(idx / 3);
      const col = idx % 3;
      const bx = PAD_X + col * (BTN_SIZE + GAP);
      const by = GRID_Y + row * (BTN_SIZE + GAP);

      if (x >= bx && x <= bx + BTN_SIZE && y >= by && y <= by + BTN_SIZE) {
        found = keypad[idx];
        break;
      }
    }

    if (!found) {
      const delY = GRID_Y + 3 * (BTN_SIZE + GAP);
      if (y >= delY && y <= delY + 48 && x >= PAD_X && x <= CANVAS_W - PAD_X) {
        found = 'delete';
      }
    }

    setHoveredKey(found);
  };

  const handlePointerLeave = () => {
    setHoveredKey(null);
  };

  if (keypad.length === 0) return null;

  return (
    <div className={`relative flex flex-col items-center bg-surface p-4 sm:p-6 rounded-2xl shadow-xl border w-full max-w-[280px] sm:max-w-sm transition-colors duration-300 ${isError ? 'border-danger bg-danger-subtle' : 'border-line-subtle'}`}>
      
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 p-1.5 sm:p-2 text-content-muted hover:text-content-secondary hover:bg-surface-muted rounded-full transition-colors z-20"
          aria-label="닫기"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      )}

      <div className={`w-full flex flex-col items-center transition-opacity duration-300 ${isSuccess ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <div className="origin-top scale-[0.72] sm:scale-[0.85] md:scale-100 h-[403px] sm:h-[476px] md:h-[560px] relative" style={{ width: CANVAS_W }}>
          <canvas
            ref={canvasRef}
            onMouseDown={handlePointerDown}
            onTouchStart={handlePointerDown}
            onMouseMove={handlePointerMove}
            onMouseLeave={handlePointerLeave}
            className="touch-none select-none cursor-pointer"
          />
          {/* Tracker Hitboxes (Invisible) */}
          <div className="absolute inset-0 pointer-events-none">
            {keypad.map((num, idx) => {
              const row = Math.floor(idx / 3);
              const col = idx % 3;
              const bx = PAD_X + col * (BTN_SIZE + GAP);
              const by = GRID_Y + row * (BTN_SIZE + GAP);
              return (
                <TrackedKeybox
                  key={num}
                  trackId={`captcha-keypad-${num}`}
                  x={bx}
                  y={by}
                  w={BTN_SIZE}
                  h={BTN_SIZE}
                />
              );
            })}
            <TrackedKeybox
              trackId="captcha-keypad-delete"
              x={PAD_X}
              y={GRID_Y + 3 * (BTN_SIZE + GAP)}
              w={CANVAS_W - PAD_X * 2}
              h={48}
            />
          </div>
        </div>
      </div>

      {isSuccess && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none mt-10">
          <div className="w-48 h-48">
            <Lottie 
              animationData={checkedAnimation} 
              loop={false} 
              onComplete={() => onSuccess(`custom-captcha-token-${Date.now()}`)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

// --- 추적용 투명 히트박스 컴포넌트 ---
const TrackedKeybox = ({ trackId, x, y, w, h }: { trackId: string, x: number, y: number, w: number, h: number }) => {
  const tracker = useTargetTracker({ trackId, isClickable: true });
  return (
    <div
      {...tracker}
      ref={tracker.ref as any}
      className="absolute pointer-events-none"
      style={{
        left: x,
        top: y,
        width: w,
        height: h,
        opacity: 0,
      }}
    />
  );
};

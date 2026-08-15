'use client';

/**
 * components/ui/voice-input.jsx
 *
 * Animated VoiceInput button — drop-in for the dashboard input bar.
 * Styled to match the existing B&W monochrome dashboard theme (bg #09090b, white accents).
 *
 * Props:
 *   onStart()           — called when recording begins
 *   onStop()            — called when recording stops
 *   className           — extra classes on the outer wrapper
 */

import React from 'react';
import { Mic } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export function VoiceInput({ className, onStart, onStop }) {
  const [listening, setListening]   = React.useState(false);
  const [time, setTime]             = React.useState(0);

  React.useEffect(() => {
    let intervalId;

    if (listening) {
      onStart?.();
      intervalId = setInterval(() => {
        setTime((t) => t + 1);
      }, 1000);
    } else {
      onStop?.();
      setTime(0);
    }

    return () => clearInterval(intervalId);
    // intentionally omit onStart/onStop from deps — they're stable callbacks
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listening]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={cn('flex flex-col items-center justify-center', className)}>
      <motion.div
        className={cn(
          'flex p-1.5 border items-center justify-center rounded-full cursor-pointer select-none transition-colors',
          listening
            // Active/recording: white border + subtle glow
            ? 'border-white/40 bg-white/5 shadow-[0_0_12px_rgba(255,255,255,0.15)]'
            // Idle: dim border
            : 'border-[#27272a] bg-transparent hover:border-white/20'
        )}
        layout
        transition={{ layout: { duration: 0.35, ease: [0.4, 0, 0.2, 1] } }}
        onClick={() => setListening((l) => !l)}
        role="button"
        aria-label={listening ? 'Stop recording' : 'Start recording'}
        aria-pressed={listening}
      >
        {/* Icon slot — always fixed 24×24 */}
        <div className="h-6 w-6 items-center justify-center flex shrink-0">
          {listening ? (
            /* Spinning white square = "stop" indicator */
            <motion.div
              className="w-3.5 h-3.5 bg-white rounded-sm"
              animate={{ rotate: [0, 180, 360] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
          ) : (
            /* Idle mic icon */
            <Mic className="w-4 h-4 text-[#71717a] group-hover:text-white" />
          )}
        </div>

        {/* Expandable section — waveform bars + timer */}
        <AnimatePresence mode="wait">
          {listening && (
            <motion.div
              key="recording-content"
              initial={{ opacity: 0, width: 0, marginLeft: 0 }}
              animate={{ opacity: 1, width: 'auto', marginLeft: 8 }}
              exit={{ opacity: 0, width: 0, marginLeft: 0 }}
              transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
              className="overflow-hidden flex gap-2 items-center justify-center pr-1"
            >
              {/* Frequency bars — purely decorative, aria-hidden */}
              <div
                className="flex gap-[2px] items-center justify-center"
                aria-hidden="true"
              >
                {[...Array(12)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="w-[2px] bg-white rounded-full"
                    initial={{ height: 2 }}
                    animate={{
                      // Random-ish heights seeded by index so they're stable across renders
                      height: [
                        2,
                        3 + ((i * 7 + 3) % 11),
                        3 + ((i * 13 + 5) % 8),
                        2,
                      ],
                    }}
                    transition={{
                      duration: 0.9 + i * 0.04,
                      repeat: Infinity,
                      delay: i * 0.05,
                      ease: 'easeInOut',
                    }}
                  />
                ))}
              </div>

              {/* Timer */}
              <span className="text-[11px] font-mono text-[#a1a1aa] w-10 text-center tabular-nums shrink-0">
                {formatTime(time)}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Screen-reader status — polite announcement */}
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {listening ? `Recording — ${formatTime(time)}` : ''}
      </span>
    </div>
  );
}

export default VoiceInput;

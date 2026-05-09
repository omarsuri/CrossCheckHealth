'use client'

import { useEffect } from 'react'
import { motion, useSpring, useTransform } from 'framer-motion'

export function InteractiveHeart() {
  const mouseX = useSpring(0, { stiffness: 70, damping: 18, mass: 0.5 })
  const mouseY = useSpring(0, { stiffness: 70, damping: 18, mass: 0.5 })

  // Map normalized [-0.5, 0.5] cursor position to rotation degrees
  const rotateY = useTransform(mouseX, [-0.5, 0.5], [-38, 38])
  const rotateX = useTransform(mouseY, [-0.5, 0.5], [22, -22])

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mouseX.set(e.clientX / window.innerWidth - 0.5)
      mouseY.set(e.clientY / window.innerHeight - 0.5)
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [mouseX, mouseY])

  return (
    <div
      className="w-full h-full flex items-center justify-center select-none"
      style={{ perspective: '900px' }}
    >
      <motion.div
        style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
        className="relative flex flex-col items-center justify-center gap-8"
      >
        {/* Ambient glow behind the heart */}
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: 320,
            height: 320,
            background:
              'radial-gradient(circle, rgba(244,63,94,0.18) 0%, rgba(34,211,238,0.06) 55%, transparent 80%)',
            filter: 'blur(28px)',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -58%)',
          }}
        />

        {/* Pulse rings */}
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="absolute rounded-full border border-rose-500/25 pointer-events-none"
            style={{
              width: 220 + i * 70,
              height: 220 + i * 70,
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -58%)',
            }}
            animate={{ scale: [1, 1.12, 1], opacity: [0.5, 0, 0.5] }}
            transition={{
              duration: 1.6,
              repeat: Infinity,
              ease: 'easeOut',
              delay: i * 0.3,
            }}
          />
        ))}

        {/* Heart with heartbeat scale animation */}
        <motion.div
          animate={{ scale: [1, 1.07, 0.97, 1.07, 1] }}
          transition={{
            duration: 1.4,
            repeat: Infinity,
            ease: 'easeInOut',
            times: [0, 0.14, 0.28, 0.42, 1],
          }}
        >
          <svg
            viewBox="0 0 100 92"
            className="w-60 h-60 md:w-72 md:h-72"
            aria-label="Animated interactive heart"
          >
            <defs>
              {/* Main fill gradient — warm red/rose */}
              <radialGradient id="hFill" cx="38%" cy="28%" r="72%">
                <stop offset="0%" stopColor="#fb7185" />
                <stop offset="45%" stopColor="#f43f5e" />
                <stop offset="100%" stopColor="#9f1239" />
              </radialGradient>

              {/* Gloss/shine overlay */}
              <radialGradient id="hShine" cx="32%" cy="22%" r="42%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.40" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
              </radialGradient>

              {/* Subtle inner shadow at bottom */}
              <radialGradient id="hShadow" cx="50%" cy="90%" r="55%">
                <stop offset="0%" stopColor="#4c0519" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#4c0519" stopOpacity="0" />
              </radialGradient>

              {/* Drop shadow / outer glow */}
              <filter id="hGlow" x="-30%" y="-30%" width="160%" height="160%">
                <feDropShadow
                  dx="0"
                  dy="4"
                  stdDeviation="7"
                  floodColor="#f43f5e"
                  floodOpacity="0.55"
                />
              </filter>

              {/* Soft highlight blur */}
              <filter id="hHighlight" x="-10%" y="-10%" width="120%" height="120%">
                <feGaussianBlur stdDeviation="1.5" />
              </filter>
            </defs>

            {/* Main heart body */}
            <path
              d="M50 84 C50 84 4 52 4 26 C4 12 14 3 27 3 C35 3 43 8 50 19 C57 8 65 3 73 3 C86 3 96 12 96 26 C96 52 50 84 50 84Z"
              fill="url(#hFill)"
              filter="url(#hGlow)"
            />

            {/* Inner shadow bottom */}
            <path
              d="M50 84 C50 84 4 52 4 26 C4 12 14 3 27 3 C35 3 43 8 50 19 C57 8 65 3 73 3 C86 3 96 12 96 26 C96 52 50 84 50 84Z"
              fill="url(#hShadow)"
            />

            {/* Gloss shine */}
            <path
              d="M50 84 C50 84 4 52 4 26 C4 12 14 3 27 3 C35 3 43 8 50 19 C57 8 65 3 73 3 C86 3 96 12 96 26 C96 52 50 84 50 84Z"
              fill="url(#hShine)"
            />

            {/* Top-left highlight blob for 3D depth */}
            <ellipse
              cx="31"
              cy="21"
              rx="11"
              ry="7"
              fill="white"
              fillOpacity="0.18"
              filter="url(#hHighlight)"
            />
          </svg>
        </motion.div>

        {/* ECG line below the heart */}
        <motion.div
          animate={{ opacity: [0.45, 0.9, 0.45] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
        >
          <svg
            width="160"
            height="28"
            viewBox="0 0 160 28"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M0 14 L30 14 L38 5 L45 23 L53 2 L61 26 L68 14 L100 14 L108 5 L115 23 L123 2 L131 26 L138 14 L160 14"
              stroke="#22D3EE"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </motion.div>
      </motion.div>
    </div>
  )
}

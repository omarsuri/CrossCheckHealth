'use client'

import { useEffect } from 'react'
import { motion, useSpring, useTransform } from 'framer-motion'
import styles from './heart-3d-scene.module.css'

export function Heart3DScene() {
  const mouseX = useSpring(0, { stiffness: 50, damping: 22, mass: 0.6 })
  const mouseY = useSpring(0, { stiffness: 50, damping: 22, mass: 0.6 })

  // Cursor offset → extra tilt on top of the CSS auto-spin
  const tiltY = useTransform(mouseX, [-0.5, 0.5], [-28, 28])
  const tiltX = useTransform(mouseY, [-0.5, 0.5], [18, -18])

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
      style={{ perspective: '1000px' }}
    >
      {/* Ambient glow behind */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: 420,
          height: 420,
          background:
            'radial-gradient(circle, rgba(244,63,94,0.14) 0%, rgba(34,211,238,0.05) 55%, transparent 75%)',
          filter: 'blur(40px)',
        }}
      />

      {/* Framer-motion layer: cursor tilt only (no transform-origin needed) */}
      <motion.div
        style={{
          rotateX: tiltX,
          rotateY: tiltY,
          transformStyle: 'preserve-3d',
        }}
      >
        {/* CSS layer: continuous auto-spin */}
        <div className={styles.spinner}>
          <div />
          <div />
          <div />
          <div />
          <div />
          <div />
        </div>
      </motion.div>
    </div>
  )
}

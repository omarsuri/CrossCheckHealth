import React from 'react'
import styles from './heart-loader.module.css'

interface HeartLoaderProps {
  /** Override the CSS custom property colour. Default: rgb(247,197,159) */
  color?: string
}

const HeartLoader = ({ color }: HeartLoaderProps) => {
  return (
    <div
      className={styles.spinner}
      style={color ? ({ '--clr': color, '--clr-alpha': `${color.replace(')', ', 0.1)').replace('rgb', 'rgba')}` } as React.CSSProperties) : undefined}
      aria-label="Loading"
      role="status"
    >
      <div />
      <div />
      <div />
      <div />
      <div />
      <div />
    </div>
  )
}

export default HeartLoader

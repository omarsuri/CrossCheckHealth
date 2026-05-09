import styles from './heart-beat-3d.module.css'

export function HeartBeat3D() {
  return (
    <div className={styles.scene}>
      <div className={styles.heart}>
        {/* 8 slices: front (bright rose) → back (deep crimson) */}
        <div className={styles.layer} />
        <div className={styles.layer} />
        <div className={styles.layer} />
        <div className={styles.layer} />
        <div className={styles.layer} />
        <div className={styles.layer} />
        <div className={styles.layer} />
        <div className={styles.layer} />
        {/* Gloss highlight above front face */}
        <div className={styles.shine} />
      </div>

      {/* Ground shadow synced to beat */}
      <div className={styles.shadow} />
    </div>
  )
}

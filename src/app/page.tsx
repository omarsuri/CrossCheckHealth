'use client'

import { HeartBeat3D } from '@/components/ui/heart-beat-3d'
import { Spotlight } from '@/components/ui/spotlight'

export default function ComingSoonPage() {
  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-[#020817] flex flex-col items-center justify-center">
      {/* Spotlight beams */}
      <Spotlight
        className="-top-40 -left-20 md:left-10 md:-top-20"
        fill="#22D3EE"
      />
      <Spotlight
        className="top-10 right-0 md:right-20"
        fill="#0891B2"
      />

      {/* Background grid */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(#22D3EE 1px, transparent 1px), linear-gradient(90deg, #22D3EE 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />

      {/* Radial fade */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(8,145,178,0.08),rgba(2,8,23,0))]" />

      <div className="relative z-10 flex flex-col lg:flex-row items-center justify-center w-full max-w-7xl mx-auto px-6 lg:px-12 gap-0 lg:gap-8 min-h-screen">

        {/* Left — Brand + Text */}
        <div className="flex-1 flex flex-col justify-center items-center lg:items-start text-center lg:text-left pt-16 lg:pt-0">

          {/* Logomark */}
          <div className="flex items-center gap-3 mb-10">
            <span className="text-lg font-semibold tracking-wide text-white/90">
              CrossCheck<span className="text-cyan-400">Health</span>
            </span>
          </div>

          {/* Status badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-cyan-500/20 bg-cyan-500/5 mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400" />
            </span>
            <span className="text-xs font-medium text-cyan-400 tracking-widest uppercase">
              In Development
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-6xl xl:text-7xl font-bold leading-[1.05] mb-6">
            <span className="block text-white">Something</span>
            <span className="block bg-clip-text text-transparent bg-gradient-to-r from-cyan-300 via-teal-300 to-cyan-400">
              Remarkable
            </span>
            <span className="block text-white/80 text-4xl md:text-5xl xl:text-6xl font-light mt-2">
              in Progress
            </span>
          </h1>

          {/* Tagline */}
          <p className="text-white/40 text-base md:text-lg max-w-md leading-relaxed mb-12 font-light">
            Building your all-in-one health platform.
          </p>

        </div>

        {/* Right — 3D beating heart */}
        <div className="flex-1 relative w-full h-[55vh] lg:h-screen max-h-[700px]">
          <HeartBeat3D />
        </div>
      </div>

      {/* Bottom bar */}
      <div className="absolute bottom-0 inset-x-0 border-t border-white/[0.04] py-5 px-8 flex items-center justify-center z-10">
        <p className="text-white/20 text-xs">
          © 2026 CrossCheckHealth. All rights reserved.
        </p>
      </div>
    </main>
  )
}

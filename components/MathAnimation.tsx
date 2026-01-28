"use client"; // 必須加上這一行

import React, { useState, useRef, useEffect } from 'react';
import { motion, useAnimation } from 'framer-motion';

const MathAnimation: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent) => {
    if (containerRef.current) {
      const { width, height } = containerRef.current.getBoundingClientRect();
      const x = (e.clientX / width - 0.5) * 2;
      const y = (e.clientY / height - 0.5) * 2;
      setMousePosition({ x, y });
    }
  };

  // --- VOXEL SYSTEM ---
  // A Voxel is a single 3D cube
  const Voxel = ({ x, y, z, color }: { x: number, y: number, z: number, color: string }) => {
     // Size of one voxel unit
     const s = 14; 
     return (
        <div className="absolute transform-style-3d"
             style={{
                 width: s, height: s,
                 transform: `translateX(${x * s}px) translateY(${y * s}px) translateZ(${z * s}px)`
             }}>
             {/* Front */}
             <div className={`absolute inset-0 ${color} opacity-90 border-[0.5px] border-white/20`} style={{ transform: `translateZ(${s/2}px)` }} />
             {/* Back */}
             <div className={`absolute inset-0 ${color} opacity-90`} style={{ transform: `rotateY(180deg) translateZ(${s/2}px)` }} />
             {/* Right */}
             <div className={`absolute inset-0 ${color} opacity-80`} style={{ transform: `rotateY(90deg) translateZ(${s/2}px)` }} />
             {/* Left */}
             <div className={`absolute inset-0 ${color} opacity-80`} style={{ transform: `rotateY(-90deg) translateZ(${s/2}px)` }} />
             {/* Top */}
             <div className={`absolute inset-0 ${color} opacity-100 border-[0.5px] border-white/30`} style={{ transform: `rotateX(90deg) translateZ(${s/2}px)` }}>
                 {/* Lego Stud */}
                 <div className="absolute top-[20%] left-[20%] right-[20%] bottom-[20%] bg-white/20 rounded-full shadow-inner"></div>
             </div>
             {/* Bottom */}
             <div className={`absolute inset-0 ${color} opacity-60`} style={{ transform: `rotateX(-90deg) translateZ(${s/2}px)` }} />
        </div>
     );
  };

  // Construct letters from 3D coordinates (x, y, z)
  const letterD = [
    [0,0,0], [1,0,0], [2,0,0],
    [0,1,0],          [3,1,0],
    [0,2,0],          [3,2,0],
    [0,3,0],          [3,3,0],
    [0,4,0], [1,4,0], [2,4,0]
  ];

  const letterS = [
    [1,0,0], [2,0,0], [3,0,0],
    [0,1,0],
    [1,2,0], [2,2,0],
             [3,3,0],
    [0,4,0], [1,4,0], [2,4,0]
  ];

  const letterA = [
             [1,0,0], [2,0,0],
    [0,1,0],          [3,1,0],
    [0,2,0], [1,2,0], [2,2,0], [3,2,0],
    [0,3,0],          [3,3,0],
    [0,4,0],          [3,4,0]
  ];

  const letterI = [
    [0,0,0], [1,0,0], [2,0,0],
             [1,1,0],
             [1,2,0],
             [1,3,0],
    [0,4,0], [1,4,0], [2,4,0]
  ];

  // Component to render a Voxel Letter
  const VoxelLetter = ({ coords, color, offset }: { coords: number[][], color: string, offset: [number, number, number] }) => (
    <div className="absolute transform-style-3d" style={{ transform: `translateX(${offset[0]}px) translateY(${offset[1]}px) translateZ(${offset[2]}px)` }}>
        {coords.map((pos, i) => (
            <Voxel key={i} x={pos[0]} y={pos[1]} z={pos[2]} color={color} />
        ))}
    </div>
  );

  // Matrix Rain Background
  const MatrixStream = ({ x, delay }: { x: number, delay: number }) => (
    <motion.div 
        className="absolute top-0 w-[1px] bg-gradient-to-b from-transparent via-blue-500/50 to-transparent"
        style={{ left: `${x}%`, height: '40%' }}
        animate={{ top: ['-40%', '100%'], opacity: [0, 1, 0] }}
        transition={{ duration: 3 + Math.random() * 2, repeat: Infinity, delay: delay, ease: "linear" }}
    />
  );

  // Floating Light Particles
  const FloatingParticle = ({ delay, x, y, size, color }: { delay: number, x: number, y: number, size: number, color: string }) => (
      <motion.div
        className={`absolute rounded-full blur-[2px] ${color}`}
        style={{ width: size, height: size, left: `${x}%`, top: `${y}%` }}
        animate={{
            y: [0, -40, 0],
            x: [0, 20, 0],
            opacity: [0.2, 0.8, 0.2],
            scale: [1, 1.5, 1]
        }}
        transition={{
            duration: 5 + Math.random() * 5,
            repeat: Infinity,
            delay: delay,
            ease: "easeInOut"
        }}
      >
          {/* Inner bright core */}
          <div className="absolute inset-0 bg-white opacity-50 blur-[1px] rounded-full scale-50" />
      </motion.div>
  );

  return (
    <div 
        ref={containerRef} 
        onMouseMove={handleMouseMove}
        className="relative w-full h-full bg-[#050505] overflow-hidden flex items-center justify-center perspective-[800px]"
    >
        {/* Environment - Matrix Vibes */}
        <div className="absolute inset-0 pointer-events-none opacity-20">
            {[...Array(20)].map((_, i) => (
                <MatrixStream key={i} x={i * 5} delay={Math.random() * 5} />
            ))}
        </div>

        {/* Floating Light Elements */}
        <div className="absolute inset-0 pointer-events-none z-0">
             {[...Array(8)].map((_, i) => (
                 <FloatingParticle 
                    key={i}
                    delay={i * 0.8}
                    x={20 + Math.random() * 60}
                    y={20 + Math.random() * 60}
                    size={4 + Math.random() * 8}
                    color={i % 2 === 0 ? "bg-blue-400" : "bg-purple-400"}
                 />
             ))}
             {/* Larger glow orbs */}
             <motion.div 
                className="absolute top-1/4 left-1/4 w-32 h-32 bg-blue-600/10 rounded-full blur-[50px]"
                animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
             />
             <motion.div 
                className="absolute bottom-1/4 right-1/4 w-40 h-40 bg-purple-600/10 rounded-full blur-[60px]"
                animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.4, 0.2] }}
                transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
             />
        </div>
        
        {/* Floor Grid */}
        <div className="absolute bottom-[-100px] w-[300%] h-[300%] bg-[linear-gradient(rgba(30,58,138,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(30,58,138,0.2)_1px,transparent_1px)] bg-[length:40px_40px] transform-style-3d rotate-x-[80deg] translate-z-[-100px] animate-grid-flow opacity-50"></div>

        {/* --- MAIN STAGE --- */}
        <motion.div 
            className="relative transform-style-3d flex items-center justify-center"
            style={{ scale: 1.5 }}
            animate={{ 
                rotateY: mousePosition.x * 10, // Reduced rotation sensitivity for smoothness
                rotateX: -10 + mousePosition.y * 10 
            }}
            transition={{ type: "spring", stiffness: 50, damping: 30 }} // Softer spring
        >
            
            {/* Character D - Gentle Float */}
            <motion.div 
                className="transform-style-3d"
                animate={{ y: [-10, 10, -10], rotateZ: [-2, 2, -2] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            >
                <VoxelLetter coords={letterD} color="bg-blue-600" offset={[-120, -30, 0]} />
            </motion.div>

            {/* Character S - Gentle Float (Opposite Phase) */}
            <motion.div 
                className="transform-style-3d"
                animate={{ y: [10, -10, 10], rotateY: [-5, 5, -5] }}
                transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
            >
                <VoxelLetter coords={letterS} color="bg-purple-600" offset={[-50, -30, 0]} />
            </motion.div>

            {/* Character A - Gentle Float (Was Jumping, now Smooth) */}
            <motion.div 
                className="transform-style-3d"
                animate={{ 
                    y: [-5, 15, -5],
                    rotateX: [2, -2, 2]
                }}
                transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            >
                <VoxelLetter coords={letterA} color="bg-pink-600" offset={[20, -30, 0]} />
            </motion.div>

            {/* Character I - Gentle Float (Was Squashing, now Smooth) */}
            <motion.div 
                className="transform-style-3d"
                animate={{ 
                    y: [15, -5, 15],
                    rotateZ: [2, -2, 2]
                }}
                transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
            >
                <VoxelLetter coords={letterI} color="bg-green-600" offset={[90, -30, 0]} />
            </motion.div>

        </motion.div>
        
        {/* Cinematic Vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#050505_90%)] pointer-events-none"></div>
    </div>
  );
};

export default MathAnimation;
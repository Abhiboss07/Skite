"use client";

import { Environment, Float, Lightformer } from "@react-three/drei";
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";

import { usePrefersReducedMotion } from "@/hooks/use-media-query";

/**
 * "The Redraw" in three dimensions.
 *
 * A horizontal scan plane sweeps through a crystal. Everything the scan has
 * already passed is rendered — faceted, metallic, lit. Everything ahead of it
 * is still an unresolved wireframe. It is the product's entire promise as one
 * continuous object.
 *
 * Implemented with two meshes sharing one geometry and opposing clipping
 * planes rather than a custom shader: stock three.js clipping is exact at the
 * seam, costs nothing, and cannot break across driver quirks.
 */

/** Slightly beyond the crystal's radius, so the sweep fully clears both poles. */
const SCAN_RANGE = 1.32;

function RedrawCrystal({ pointer }: { pointer: React.RefObject<THREE.Vector2> }) {
  const group = useRef<THREE.Group>(null);
  const solidRef = useRef<THREE.Mesh>(null);
  const scanRing = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const geometry = useMemo(() => new THREE.IcosahedronGeometry(1.18, 2), []);
  const wireGeometry = useMemo(() => new THREE.WireframeGeometry(geometry), [geometry]);

  // Opposing half-spaces. `constant` is animated each frame to move the seam.
  const solidClip = useMemo(() => new THREE.Plane(new THREE.Vector3(0, -1, 0), 0), []);
  const wireClip = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;

    // Scan sweeps on a slow sine so it dwells at the extremes, where the object
    // reads as fully sketch or fully rendered.
    const scanY = Math.sin(t * 0.42) * SCAN_RANGE;
    solidClip.constant = scanY;
    wireClip.constant = -scanY;

    if (scanRing.current) {
      scanRing.current.position.y = scanY;
      const material = scanRing.current.material as THREE.MeshBasicMaterial;
      material.opacity = 0.55 + Math.sin(t * 3) * 0.12;
    }

    if (group.current) {
      group.current.rotation.y += delta * 0.16;

      // Ease toward the pointer rather than tracking it directly — direct
      // tracking makes the object feel weightless and twitchy.
      const target = pointer.current ?? new THREE.Vector2();
      group.current.rotation.x = THREE.MathUtils.damp(
        group.current.rotation.x,
        target.y * 0.32,
        3,
        delta,
      );
      group.current.rotation.z = THREE.MathUtils.damp(
        group.current.rotation.z,
        -target.x * 0.18,
        3,
        delta,
      );
    }

    if (solidRef.current) {
      const material = solidRef.current.material as THREE.MeshStandardMaterial;
      material.emissiveIntensity = THREE.MathUtils.damp(
        material.emissiveIntensity,
        hovered ? 0.7 : 0.22,
        4,
        delta,
      );
    }
  });

  return (
    <group ref={group}>
      <Float speed={1.4} rotationIntensity={0.22} floatIntensity={0.55}>
        {/* Resolved half — faceted, metallic, catching the rig lights */}
        <mesh
          ref={solidRef}
          geometry={geometry}
          onPointerOver={(event: ThreeEvent<PointerEvent>) => {
            event.stopPropagation();
            setHovered(true);
          }}
          onPointerOut={() => setHovered(false)}
        >
          <meshStandardMaterial
            flatShading
            color="#1b2a63"
            metalness={0.82}
            roughness={0.24}
            emissive="#2e6bff"
            emissiveIntensity={0.28}
            clippingPlanes={[solidClip]}
            clipShadows
          />
        </mesh>

        {/* Unresolved half — still just strokes */}
        <lineSegments geometry={wireGeometry}>
          <lineBasicMaterial
            color="#6690ff"
            transparent
            opacity={0.42}
            clippingPlanes={[wireClip]}
          />
        </lineSegments>

        {/* The scan itself */}
        <mesh ref={scanRing} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.14, 1.26, 96]} />
          <meshBasicMaterial
            color="#67e8f9"
            transparent
            opacity={0.6}
            side={THREE.DoubleSide}
            toneMapped={false}
          />
        </mesh>
      </Float>
    </group>
  );
}

/**
 * Wireframe UI panels orbiting the crystal — the raw material going in.
 */
function OrbitingFrames({ pointer }: { pointer: React.RefObject<THREE.Vector2> }) {
  const group = useRef<THREE.Group>(null);

  const frames = useMemo(
    () => [
      { radius: 3.1, y: 0.9, speed: 0.22, scale: 0.72, tilt: 0.32, offset: 0 },
      { radius: 3.6, y: -1.1, speed: -0.17, scale: 0.58, tilt: -0.28, offset: 2.1 },
      { radius: 2.7, y: -0.3, speed: 0.28, scale: 0.46, tilt: 0.5, offset: 4.2 },
      { radius: 4.0, y: 1.6, speed: -0.13, scale: 0.5, tilt: -0.44, offset: 5.4 },
    ],
    [],
  );

  useFrame((state, delta) => {
    if (!group.current) return;
    const target = pointer.current ?? new THREE.Vector2();
    group.current.rotation.y = THREE.MathUtils.damp(
      group.current.rotation.y,
      target.x * 0.22,
      2,
      delta,
    );
    group.current.children.forEach((child, i) => {
      const frame = frames[i];
      const angle = state.clock.elapsedTime * frame.speed + frame.offset;
      child.position.set(
        Math.cos(angle) * frame.radius,
        frame.y + Math.sin(state.clock.elapsedTime * 0.6 + frame.offset) * 0.22,
        Math.sin(angle) * frame.radius,
      );
      child.rotation.y = -angle + Math.PI / 2;
      child.rotation.z = frame.tilt;
    });
  });

  return (
    <group ref={group}>
      {frames.map((frame, i) => (
        <group key={i} scale={frame.scale}>
          <WireFrame />
        </group>
      ))}
    </group>
  );
}

/** A single wireframe "page": outer frame plus placeholder content rules. */
function WireFrame() {
  const lines = useMemo(() => {
    const points: number[] = [];
    const push = (x1: number, y1: number, x2: number, y2: number) => {
      points.push(x1, y1, 0, x2, y2, 0);
    };

    // Outer frame
    push(-1, 1.3, 1, 1.3);
    push(1, 1.3, 1, -1.3);
    push(1, -1.3, -1, -1.3);
    push(-1, -1.3, -1, 1.3);
    // Header rule
    push(-1, 0.85, 1, 0.85);
    // Content blocks
    push(-0.75, 0.45, 0.35, 0.45);
    push(-0.75, 0.15, 0.6, 0.15);
    push(-0.75, -0.15, 0.1, -0.15);
    // Media placeholder with its diagonal
    push(-0.75, -0.6, 0.75, -0.6);
    push(0.75, -0.6, 0.75, -1.05);
    push(0.75, -1.05, -0.75, -1.05);
    push(-0.75, -1.05, -0.75, -0.6);
    push(-0.75, -1.05, 0.75, -0.6);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
    return geometry;
  }, []);

  return (
    <lineSegments geometry={lines}>
      <lineBasicMaterial color="#8ba3d9" transparent opacity={0.28} />
    </lineSegments>
  );
}

/** Slow drifting motes — depth cues that keep the empty space from reading flat. */
function Motes({ count = 90 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null);

  const geometry = useMemo(() => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 14;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 9;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 8;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [count]);

  useFrame((state, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.02;
      ref.current.position.y = Math.sin(state.clock.elapsedTime * 0.18) * 0.25;
    }
  });

  return (
    <points ref={ref} geometry={geometry}>
      <pointsMaterial
        size={0.035}
        color="#9db6ff"
        transparent
        opacity={0.55}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

function Rig({ pointer }: { pointer: React.RefObject<THREE.Vector2> }) {
  useFrame((state) => {
    if (!pointer.current) return;
    pointer.current.set(state.pointer.x, state.pointer.y);
  });
  return null;
}

export function RedrawScene({ className }: { className?: string }) {
  const reducedMotion = usePrefersReducedMotion();
  const pointer = useRef(new THREE.Vector2(0, 0));

  return (
    <div className={className} aria-hidden>
      <Canvas
        // Cap DPR: above ~1.75 the extra pixels are invisible here but the
        // fragment cost on high-DPI laptops is very real.
        dpr={[1, 1.75]}
        camera={{ position: [0, 0, 6.4], fov: 42 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        onCreated={({ gl }) => {
          // Required for per-material clippingPlanes, which drive the scan.
          gl.localClippingEnabled = true;
        }}
        // Under reduced motion, render a single frame and stop.
        frameloop={reducedMotion ? "demand" : "always"}
      >
        {/* No <color attach="background"> here on purpose: setting scene.background
            makes the canvas opaque and would paint a rectangle over the page. The
            canvas must stay transparent so the aurora shows through. */}

        <ambientLight intensity={0.4} />
        <pointLight position={[5, 4, 5]} intensity={70} color="#6690ff" distance={24} />
        <pointLight position={[-5, -3, 3]} intensity={52} color="#a78bfa" distance={22} />
        <pointLight position={[0, 5, -4]} intensity={40} color="#22d3ee" distance={20} />

        {/* Lightformers build the reflection environment locally — no HDR fetch,
            so the scene has no network dependency and no pop-in. */}
        <Environment resolution={192}>
          <Lightformer intensity={2.4} position={[0, 4, 3]} scale={[8, 3, 1]} color="#6690ff" />
          <Lightformer intensity={1.6} position={[-5, -1, 2]} scale={[5, 5, 1]} color="#22d3ee" />
          <Lightformer intensity={1.9} position={[5, 1, -2]} scale={[5, 5, 1]} color="#a78bfa" />
          <Lightformer intensity={0.8} position={[0, -4, 1]} scale={[10, 2, 1]} color="#ffffff" />
        </Environment>

        <Rig pointer={pointer} />
        <RedrawCrystal pointer={pointer} />
        <OrbitingFrames pointer={pointer} />
        <Motes />
      </Canvas>
    </div>
  );
}

export default RedrawScene;

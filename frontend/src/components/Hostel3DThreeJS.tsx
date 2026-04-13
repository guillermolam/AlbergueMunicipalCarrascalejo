import React from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, Box, Environment } from "@react-three/drei";
import styles from "./Hostel3DThreeJS.module.css";

export default function Hostel3DThreeJS() {
  return (
    <div className={styles["hostel3dthreejs-container"]}>
      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[0, 5, 15]} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1.2} castShadow={true} />
        <Box position={[0, 1, 0]} args={[4, 2, 4]} castShadow receiveShadow>
          <meshStandardMaterial color="#a89e78" />
        </Box>
        <Box position={[0, 0, 0]} args={[20, 0.5, 20]} receiveShadow>
          <meshStandardMaterial color="#3a3a2a" />
        </Box>
        <Environment preset="sunset" />
        <OrbitControls enablePan enableZoom enableRotate />
      </Canvas>
    </div>
  );
}

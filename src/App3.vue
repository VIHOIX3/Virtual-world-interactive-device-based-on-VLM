<script setup>
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import gsap from 'gsap';


// 创建 Three.js 场景
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 5);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// const gridHelper = new THREE.GridHelper( 10, 10, 0x2C2C2C, 0x888888 );
// scene.add(gridHelper);

// const axes = new THREE.AxesHelper()
// // 将坐标轴添加到场景中
// scene.add(axes)

// 添加光照
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

// 轨道控制
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// 顶点着色器
const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

// 片元着色器（镭射渐变光流）
const fragmentShader = `
uniform float u_time;
varying vec2 vUv;

void main() {
  vec3 color1 = vec3(1.0, 0.2, 0.2); // 红色
  vec3 color2 = vec3(0.2, 0.2, 1.0); // 蓝色
  float wave = sin(vUv.y * 10.0 + u_time) * 0.5 + 0.5;
  vec3 finalColor = mix(color1, color2, wave);
  gl_FragColor = vec4(finalColor, 1.0);
}
`;

// 着色器材质
const laserMaterial = new THREE.ShaderMaterial({
  uniforms: { u_time: { value: 0.0 } },
  vertexShader: vertexShader,
  fragmentShader: fragmentShader,
  transparent: true, // 允许透明
  opacity:0.1,
});


// 加载 MTL 材质
let flower
const mtlLoader = new MTLLoader();
mtlLoader.load('test12.mtl', (materials) => {
  materials.preload(); // 确保材质加载完成

  // 加载 OBJ 并应用 MTL
  const objLoader = new OBJLoader();
  objLoader.setMaterials(materials);
  objLoader.load('test12.obj', (object) => {
    flower=object;
    flower.position.set(0,0.5,-0.5);
    scene.add(object);

    // **检查材质是否生效**
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        console.log("材质:", child.material);
        if (!child.material.map) {
          console.warn("⚠️ 纹理贴图未正确加载");
        }
      }
    });

    // **调整材质为 PBR**
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = new THREE.MeshStandardMaterial({
          map: child.material.map || null,
          metalness: 0.5,
          roughness: 0.5,
          side: THREE.DoubleSide
        });
      }
    });


    // **遍历所有 Mesh，设置透明度**
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        // **启用透明 & 设定透明度**
        child.material.transparent = true;
        child.material.opacity = 0.8;

        // **确保模型双面可见**
        child.material.side = THREE.DoubleSide;

        // **如果材质有贴图，加载贴图**
        if (child.material.map) {
          child.material.map.anisotropy = renderer.capabilities.getMaxAnisotropy(); // 增强纹理清晰度
          child.material.map.needsUpdate = true;
        }

        // // **如果有 Alpha 贴图，允许透明通道**
        // if (child.material.alphaMap) {
        //   child.material.alphaTest = 1; // 让 Alpha 透明部分可见
        // }
      }
    });

    // **遍历所有 Mesh，设置发光**
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        // **替换为发光材质**
        child.material = new THREE.MeshStandardMaterial({
          map: child.material.map || null,
          emissive: new THREE.Color(0x00ff00), // **青绿色的发光**
          emissiveIntensity: 0.01, // **发光强度**
          metalness: 0.1,
          roughness: 0.1,
        });

        // // **让发光强度缓慢变化（呼吸光效）**
        // gsap.to(child.material, {
        //   emissiveIntensity: 1.2,
        //   duration: 2,
        //   repeat: -1,
        //   yoyo: true,
        //   ease: "sine.inOut",
        // });
      }
    });



  });
});


// 动画循环
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  // laserMaterial.uniforms.u_time.value += 0.05;
  if (flower)
    flower.rotation.y+=0.001;
  renderer.render(scene, camera);
}
animate();

</script>

<template>

</template>

<style>
*{
  margin: 0;
  padding:0;
}

canvas{
  display: block;
  position: fixed;
  left: 0;
  top: 0;
  width: 100vw;
  height: 100vh;
}
</style>

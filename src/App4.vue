<script>
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import gsap from 'gsap';


// 1️⃣ 创建 Three.js 场景
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 2);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// 2️⃣ 添加光照
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

// 3️⃣ 轨道控制
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;





// **粒子系统 & 目标模型**
let particles, model;

// **加载 MTL 材质**
const mtlLoader = new MTLLoader();
mtlLoader.load('test12.mtl', (materials) => {
  materials.preload();

  // **加载 OBJ 并应用 MTL**
  const objLoader = new OBJLoader();
  objLoader.setMaterials(materials);
  objLoader.load('test12.obj', (object) => {
    scene.add(object);
    model = object;

    // **让模型初始不可见**
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material.transparent = true;
        child.material.opacity = 0;
      }
    });

    // 遍历所有 Mesh，确保 `geometry` 具备 `index`
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const geometry = child.geometry;

        // **如果没有 index，自动生成索引**
        if (!geometry.index) {
          console.warn("⚠️ 该模型没有索引，正在手动生成索引...");
          geometry.setIndex([...Array(geometry.attributes.position.count).keys()]);
        }

        createParticleSystem(child); // 只有 `Mesh` 可以参与采样
      }
    });





  });
});

// **创建粒子系统**
function createParticleSystem(mesh) {
  const sampler = new MeshSurfaceSampler(mesh).build(); // 采样 OBJ 的表面点
  const numParticles = 1500;
  const positions = new Float32Array(numParticles * 3);
  const targetPositions = new Float32Array(numParticles * 3);

  for (let i = 0; i < numParticles; i++) {
    const tempPosition = new THREE.Vector3();
    sampler.sample(tempPosition);

    // **初始粒子位置在地面**
    positions[i * 3] = Math.random(-0.5,0.5);
    positions[i * 3 + 1] = -2; // **让粒子从地下开始**
    positions[i * 3 + 2] = Math.random(-1,1) * 2-1;

    // **目标位置是 OBJ 模型的顶点**
    targetPositions[i * 3] = tempPosition.x;
    targetPositions[i * 3 + 1] = tempPosition.y;
    targetPositions[i * 3 + 2] = tempPosition.z;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("targetPosition", new THREE.BufferAttribute(targetPositions, 3));

  const material = new THREE.PointsMaterial({
    size: 0.01,
    color: 0xffffff,
    transparent: true,
    opacity: 0.8,
  });

  particles = new THREE.Points(geometry, material);
  scene.add(particles);

  // **开始粒子动画**
  startTransformation();
}

// **粒子上升、旋转并变成模型**
function startTransformation() {
  const positions = particles.geometry.attributes.position.array;
  const targetPositions = particles.geometry.attributes.targetPosition.array;

  //**粒子上升 转**
  gsap.to(positions, {
    duration: 4,
    ease: "power2.out",
    onUpdate: () => {
      for (let i = 0; i < positions.length; i += 3) {
        positions[i] += (targetPositions[i] - positions[i]) * 0.008; // x 方向移动
        positions[i + 1] += (targetPositions[i + 1] - positions[i + 1]) * 0.008; // y 方向移动
        positions[i + 2] += (targetPositions[i + 2] - positions[i + 2]) * 0.008; // z 方向移动
      }
      particles.geometry.attributes.position.needsUpdate = true;
    },
    onComplete: () => {
      // **粒子淡出，模型显现**
      gsap.to(particles.material, {
        opacity: 0,
        duration: 8,
        onComplete: () => {
          scene.remove(particles);
          gsap.to(model.children, {
            opacity: 0.7,
            duration: 8,
            onUpdate: () => {
              model.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                  child.material.opacity += 0.01;
                }
              });
            },
            onComplete:()=>{
              // **遍历所有 Mesh，设置发光,透明**
              model.traverse((child) => {
                console.log('change mesh to tickle')
                if (child instanceof THREE.Mesh) {
                  // **替换为发光材质**
                  child.material = new THREE.MeshStandardMaterial({
                    map: child.material.map || null,
                    emissive: new THREE.Color(0x00ff00), // **青绿色的发光**
                    emissiveIntensity: 0.01, // **发光强度**
                    metalness: 0.1,
                    roughness: 0.1,
                  });
                  child.material.transparent=true;
                  child.material.opacity=0.8;
                  child.material.side=THREE.DoubleSide;
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
            }
          });
          },
      });


    },
  });
}

// 4️⃣ 动画循环
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
  if (model){
    model.rotation.y += 0.001;
    particles.rotation.y += 0.001;
}
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

<script setup>
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js';
import gsap from 'gsap';
import {GUI} from "three/examples/jsm/libs/lil-gui.module.min.js"; //li-GUI
import {OBJLoader} from 'three/examples/jsm/loaders/OBJLoader.js';
import * as Three from "three";
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
// 创建场景、相机和渲染器
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1, 5);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// const axes = new Three.AxesHelper()
// // 将坐标轴添加到场景中
// scene.add(axes)

// 3️⃣ 轨道控制
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// 添加光照
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);


// 加载OBJ模型
let model;
const pos_params={positionX:0,
  positionY:0,
  positionZ:0};
// // 创建辅助线
// var gridHelper = new THREE.GridHelper( 30, 30, 0x2C2C2C, 0x888888 );
// scene.add(gridHelper);

const objLoader = new OBJLoader();
let particles;
const numParticles = 3000; // 设定粒子数
const noiseStrength = 0.015; //晃动幅度
let startShaking = false;//晃动标志
objLoader.load('test13.obj', (object) => {
  // dog=object;
  model = object.children[0];
  // scene.add(model);
  // model.position.set(0, -0.5, 0);
  // model.scale.set(0.00001,0.00001,0.0000001);
  model.rotation.set(2,0,0);
// **遍历所有 Mesh 确保正确计算尺寸**
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry.computeBoundingBox();
    }
  });

  // **计算原始尺寸**
  const boundingBox = new THREE.Box3().setFromObject(object);
  const size = new THREE.Vector3();
  boundingBox.getSize(size);
  console.log('原始尺寸',size)
  // **计算缩放比例**
  const maxDim = Math.max(size.x, size.y, size.z); // 获取最大边长
  const scale = 1 / maxDim; // 计算缩放比例

  // **遍历 Group 内所有 Mesh 进行缩放**
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      console.log('缩放')
      child.scale.set(scale, scale, 0.1*scale);
    }
  });

  // **更新世界矩阵**
  object.updateMatrixWorld(true);

  // **重新计算缩放后的包围盒**
  const newBoundingBox = new THREE.Box3().setFromObject(object);
  const newSize = new THREE.Vector3();
  newBoundingBox.getSize(newSize);
  console.log("缩放后尺寸:", newSize);
  const center = new THREE.Vector3();
  newBoundingBox.getCenter(center);
  // console.log('缩放尺寸',size)
  // **确保模型居中**
  object.position.sub(center);

  // 采样模型表面点
  const sampler = new MeshSurfaceSampler(model).build();
  const positions = new Float32Array(numParticles * 3);
  const targetPositions = new Float32Array(numParticles * 3);
  const colors = new Float32Array(numParticles * 3);

  for (let i = 0; i < numParticles; i++) {
    const tempPosition = new THREE.Vector3();
    sampler.sample(tempPosition);

    // 赋值初始位置（起始点，可以让它们从某个点飞入）
    positions.set([Math.random(-1,1) * 2-1, -2, Math.random(-1,1) * 2-1 ], i * 3);

    // 目标位置，即模型表面点
    targetPositions.set([tempPosition.x, tempPosition.y, tempPosition.z], i * 3);

    // **给粒子随机颜色（暖色调）**
    const color = new THREE.Color();
    color.setHSL(Math.random() * 0.1 + 0.08, 1, Math.random() * 0.6 + 0.4); // 生成金黄色调颜色
    colors.set([color.r, color.g, color.b], i * 3);
  }

  // 创建粒子几何体
  const particleGeometry = new THREE.BufferGeometry();
  particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  particleGeometry.setAttribute('targetPosition', new THREE.BufferAttribute(targetPositions, 3));
  particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3)); // 绑定颜色

  // 创建粒子材质
  const particleMaterial = new THREE.PointsMaterial({
    size: 0.01,
    color: 0xff8800,
    vertexColors: true,
    transparent: true,
    opacity: 0.7,
    depthWrite: false,
  });

  // 创建粒子系统
  particles = new THREE.Points(particleGeometry, particleMaterial);
  scene.add(particles);

  // 让粒子缓动到目标位置
  gsap.to(positions, {
    duration: 3.3,
    onUpdate: () => {
      const posArray = particles.geometry.attributes.position.array;
      const targetArray = particles.geometry.attributes.targetPosition.array;

      for (let i = 0; i < posArray.length; i++) {
        posArray[i] += (targetArray[i] - posArray[i]) * 0.028; // 缓动效果
      }
      particles.geometry.attributes.position.needsUpdate = true;
    },
    onComplete: () => {
      console.log('finish fly');
      startShaking=true;
      animateColors();
    },
    ease: "power2.out"
  });
});

// **让粒子颜色产生轻微波动**
function animateColors() {
  gsap.to(particles.material, {
    duration: 2,
    opacity: 0.3, // 透明度降低，模拟星光暗淡
    repeat: -1, // 无限循环
    yoyo: true, // 让动画往返播放
    ease: "sine.inOut",
  });

  const colors = particles.geometry.attributes.color.array;
  function flicker() {
    for (let i = 0; i < colors.length; i += 3) {
      const intensity = Math.random() * 0.2 + 0.8; // 颜色亮度变化
      colors[i] *= intensity;
      colors[i + 1] *= intensity;
      colors[i + 2] *= intensity;
    }
    particles.geometry.attributes.color.needsUpdate = true;
    setTimeout(flicker, 500 + Math.random() * 500); // 500ms - 1000ms 之间的随机闪烁
  }
  // flicker();
}

const gui = new GUI();
const params = {
  size: 0.03,
  opacity: 0.8,
  color: "#00ff00",
  reductionFactor: 5,
};

gui.add(params, "size", 0.01, 0.1, 0.01).onChange((value) => {
  if (particles) {
    particles.material.size = value;
  }
});

gui.add(params, "opacity", 0.1, 1, 0.05).onChange((value) => {
  if (particles) {
    particles.material.opacity = value;
  }
});

gui.addColor(params, "color").onChange((value) => {
  if (particles) {
    particles.material.color.set(value);
  }
});
{

const dogFolder=gui.addFolder('dog position');
dogFolder.add(pos_params,'positionX',-10,10).onChange((val)=>{
  model.position.x=val;
});
dogFolder.add(pos_params,'positionY',-10,10).onChange((val)=>{
  model.position.y=val;
})
dogFolder.add(pos_params,'positionZ',-10,10).onChange((val)=>{
  model.position.z=val;
})
}

const clock=new Three.Clock();
// 动画循环
function animate() {
  requestAnimationFrame(animate);
  // const time = clock.getElapsedTime();

  if (particles) {
    const posArray = particles.geometry.attributes.position.array;
    const targetArray = particles.geometry.attributes.targetPosition.array;
    // console.log(startShaking)
    if (startShaking){
      for (let i = 0; i < posArray.length; i += 3) {
        const time = performance.now() * 0.001; // 获取时间
        posArray[i] = targetArray[i] + Math.sin(time + i * 0.05) * noiseStrength; // X 轴微晃
        posArray[i + 1] = targetArray[i + 1] + Math.cos(time + i * 0.05) * noiseStrength; // Y 轴微晃
        posArray[i + 2] = targetArray[i + 2] + Math.sin(time + i * 0.05) * noiseStrength; // Z 轴微晃
      }
      particles.rotation.y+=0.002;
      particles.geometry.attributes.position.needsUpdate = true;
    }
  }

  renderer.render(scene, camera);
}
animate();



</script>

<template>
  <div>

  </div>
  <!--  <HelloWorld msg="Vite + Vue" />-->
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

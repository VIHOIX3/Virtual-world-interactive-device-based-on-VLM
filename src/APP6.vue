<script>
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import gsap from 'gsap';
import {GUI} from "three/examples/jsm/libs/lil-gui.module.min.js"; //li-GUI
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

import "https://cdnjs.cloudflare.com/ajax/libs/tracking.js/1.1.3/tracking-min.js"
import "https://cdnjs.cloudflare.com/ajax/libs/tracking.js/1.1.3/data/face-min.js"
// 初始化场景、相机、渲染器
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// 设置相机位置
camera.position.set(0, 0, 2);
camera.lookAt(0, 0, 0);

// 添加光源
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(5, 5, 5);
scene.add(light);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

// 3️⃣ 轨道控制
// import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

let model
// 加载 OBJ 模型
const mtlLoader= new MTLLoader()
mtlLoader.load('test20.mtl',(materials) => {
  materials.preload();
  const objLoader = new OBJLoader();
  objLoader.setMaterials(materials);
  objLoader.load('test20.obj', (object) => {
    // 遍历模型子对象
    model=object;
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        // 设置发光材质
        child.material = new THREE.MeshStandardMaterial({
          map: child.material.map || null,
          color: 0xffffff, // 发光颜色
          emissive: 0x880808, // 自发光颜色
          emissiveIntensity: 0.03, // 发光强度
          metalness: 0.1,
          roughness: 0.1,
        });
        child.material.transparent=true;
        child.material.opacity=0.6;
        child.material.side=THREE.DoubleSide;
      }
    });
    scene.add(object);
  });
})

// 设置 Bloom 效果
const bloomLayer = new THREE.Layers();
bloomLayer.set(1); // 设置 Bloom 层

const renderScene = new RenderPass(scene, camera);
const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);

const composer = new EffectComposer(renderer);
composer.addPass(renderScene);
composer.addPass(bloomPass);

// 将发光物体分配到 Bloom 层
scene.traverse((obj) => {
  if (obj instanceof THREE.Mesh && obj.material.emissiveIntensity > 0) {
    obj.layers.enable(1); // 启用 Bloom 层
  }
});
//
const gui = new GUI();
gui.add(bloomPass, 'strength', 0, 3).name('Bloom Strength');
gui.add(bloomPass, 'radius', 0, 1).name('Bloom Radius');
gui.add(bloomPass, 'threshold', 0, 1).name('Bloom Threshold');
// 动画循环
function animate() {
  requestAnimationFrame(animate);
  composer.render();
  model.rotation.y+=0.001;
}
animate();

</script>

<template>

</template>

<style>

</style>

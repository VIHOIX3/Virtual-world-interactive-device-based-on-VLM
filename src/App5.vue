<script>
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import gsap from 'gsap';


import "https://cdnjs.cloudflare.com/ajax/libs/tracking.js/1.1.3/tracking-min.js"
import "https://cdnjs.cloudflare.com/ajax/libs/tracking.js/1.1.3/data/face-min.js"
let scene, camera, renderer, objModel;
let video, tracker,ctx;
let targetRotationX = 0, targetRotationY = 0; // 目标旋转角度
let currentRotationX = 0, currentRotationY = 0; // 当前旋转角度
const rotationThreshold = 0.02; // **旋转阈值，防止小抖动**
// 1️⃣ 初始化 Three.js
function initThree() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0, 1.5);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // 3️⃣ 轨道控制
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(5, 5, 5);
  scene.add(light);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  //加载mtl和obj
  const mtlLoader=new MTLLoader();
  mtlLoader.load('test13.mtl', (materials) => {
    materials.preload();
    const objLoader = new OBJLoader();

    objLoader.setMaterials(materials);
    objLoader.load('test13.obj', (object) => {
      objModel= object;
      objModel.position.set(0, 0, 0);
      scene.add(objModel);

      // **确保材质可见**
      // object.traverse((child) => {
      //   if (child instanceof THREE.Mesh) {
      //     child.material.transparent = true;
      //     child.material.opacity = 0.7; // 确保不透明
      //   }
      // });

      object.traverse((child) => {
        console.log('change mesh to tickle')
        if (child instanceof THREE.Mesh) {
          // **替换为发光材质**
          child.material = new THREE.MeshStandardMaterial({
            map: child.material.map || null,
            emissive: new THREE.Color(0x00ff00), // **青绿色的发光**
            emissiveIntensity: 0.01, // **发光强度**
            metalness: 0.01,
            roughness: 0.1,
          });
          child.material.transparent=true;
          child.material.opacity=0.8;
          child.material.side=THREE.DoubleSide;

        }
      });


      animate();

    });
  })

  window.addEventListener('resize', onWindowResize);
}

// 4️⃣ 绘制人脸方框
function drawFaceBox(face) {
  ctx.strokeStyle = 'red';
  ctx.lineWidth = 2;
  ctx.strokeRect(face.x, face.y, face.width, face.height);
}

// 2️⃣ 窗口大小变化时调整 Three.js 画布
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}


// 3️⃣ 初始化人脸追踪
function initTracking() {
  video = document.getElementById('video');
  const faceCanvas = document.getElementById('faceCanvas');
  ctx = faceCanvas.getContext('2d');
  faceCanvas.width = 540;
  faceCanvas.height = 320;

  navigator.mediaDevices.getUserMedia({ video: true })
    .then((stream) => {
      video.srcObject = stream;
    })
    .catch((err) => console.error("无法获取摄像头视频", err));

  tracker = new tracking.ObjectTracker('face');
  tracker.setInitialScale(4);
  tracker.setStepSize(2);
  tracker.setEdgesDensity(0.1);

  tracking.track('#video', tracker, { camera: true });

  tracker.on('track', (event) => {
    ctx.clearRect(0, 0, faceCanvas.width, faceCanvas.height);

    if (event.data.length === 0) return;
    const face = event.data[0]; // 只取第一个人脸
    drawFaceBox(face);
    console.log(face.x,face.y);
    updateModelRotation(face);
  });
}
let time=0;
let flag=false;
let isFirstTracking = true;
let xsrc=0;
let ysrc=0;
// 4️⃣ 更新模型旋转角度（不改变位置）
function updateModelRotation(face) {
  if (!objModel) return;
  if (!flag){
    flag=true;
    xsrc=face.x + face.width / 2;
    ysrc=face.y + face.height / 2;
    return;
  }
  // 计算人脸在屏幕中的偏移量 (-1 到 1)
  const xOffset = (face.x + face.width / 2 - xsrc) /window.innerWidth * 2 ;
  const yOffset = (face.y + face.height / 2 - ysrc)/window.innerWidth * 2  ;



  // 计算旋转角度（最大 ±60°）
  const XmaxAngle = Math.PI / 2; // 60°
  const YmaxAngle = Math.PI / 2; // 60°
  // **如果变化小于阈值，忽略旋转**
  if (Math.abs(xOffset - targetRotationY) > rotationThreshold) {
    targetRotationY = xOffset * XmaxAngle; // 左右旋转
  }
  if (Math.abs(yOffset - targetRotationX) > rotationThreshold) {
    targetRotationX = -yOffset * YmaxAngle; // 上下旋转
  }
;
  // 使用 gsap 平滑动画
  if (isFirstTracking) {
    isFirstTracking = false;
    gsap.to(objModel.rotation, {
      y: targetRotationY,
      x: -targetRotationX,
      duration: 0.3,
      ease: "power3.out"
    });
  }
}

// 5️⃣ 动画渲染
function animate() {
  requestAnimationFrame(animate);
  if (objModel) {

    currentRotationX = THREE.MathUtils.lerp(currentRotationX, targetRotationX, 0.3);
    currentRotationY = THREE.MathUtils.lerp(currentRotationY, targetRotationY, 0.3);

    objModel.rotation.x = currentRotationX;
    objModel.rotation.y = currentRotationY;
    time+=1;
    // console.log(time,'偏移量',currentRotationX,currentRotationY);
  }
  renderer.render(scene, camera);
}

// 启动程序
initThree();
initTracking();

</script>

<template>

</template>

<style>

</style>

<script setup>
// 假设你已引入 three.js、OBJLoader、MTLLoader 等依赖
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


import { Water } from 'three/examples/jsm/objects/Water' //水库

// import "https://cdnjs.cloudflare.com/ajax/libs/tracking.js/1.1.3/tracking-min.js";
// import "https://cdnjs.cloudflare.com/ajax/libs/tracking.js/1.1.3/data/face-min.js";



let camera,controls;
let renderer;
let scene

initRenderer() ;
initScene() ;
initAxesHelper();
initCamera();
initControls();

init()
animate();

window.addEventListener( 'resize', onWindowResize );

// 初始化场景渲染器
function initRenderer() {
  renderer=new THREE.WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild( renderer.domElement );

}

function initScene() {
  scene=new THREE.Scene();
}

function initAxesHelper() {
  scene.add(new THREE.AxesHelper(1));
}

function initCamera() {
  camera=new THREE.PerspectiveCamera(
    90,window.innerWidth / window.innerHeight,0.1,100
  );
  camera.position.set(0.2, 0.2, 0.2);
}

function initControls() {
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableZoom = false;
  controls.enablePan = false;
  controls.rotateSpeed-=0.25;
  controls.enableDamping = true;
}

function init() {
  const textures=getTextureFromAtlasFile(
    './sun_temple_stripe.jpg',
    6
  );

  const materials=[];
  for(let i=0;i<textures.length;i++){
    materials.push(
      new THREE.MeshBasicMaterial({
        map:textures[i]
      })
    );
  }
  console.log(materials);
  //天空盒子
  const skyBox=new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    materials,
    // new THREE.MeshBasicMaterial()
  );
  skyBox.geometry.scale(1,1,-1);
  scene.add(skyBox);

}

function getTextureFromAtlasFile(file,tiles_num,){
  const texture=[];
  for(let i=0; i<tiles_num;i++){
    texture[i]=new THREE.Texture();
  }

  new THREE.ImageLoader().load(
    file,
    function (image) {
      console.log(image);
      //分解图片
      const width = image.height;
      let canvas,context;
      for(let i =0;i<tiles_num;i++){
        canvas=document.createElement('canvas');
        context=canvas.getContext('2d');//获取上下文
        canvas.height=width;
        canvas.width=width;

        context.drawImage(image,width*i,0,width,width,
          0,0,width,width);
        texture[i].image=canvas;
        texture[i].needsUpdate=true;
      }

    }
  );
  return texture;
}


function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene,camera);
}


</script>

<template>

</template>

<style scoped>

</style>

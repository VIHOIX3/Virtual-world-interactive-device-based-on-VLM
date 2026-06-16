<script setup>
//shader实现Ocean效果
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {GUI} from "three/examples/jsm/libs/lil-gui.module.min.js"; //li-GUI

import { Water } from 'three/examples/jsm/objects/Water.js' //水库
import {Sky} from 'three/examples/jsm/objects/Sky.js' //天空

let camera,controls;
let renderer;
let scene;
let water,sun,sky,cube;
let pmremGenerator, renderTarget;

let sunParms,gui;
let spotLight,lightHelper;

initRenderer() ;
initScene() ;
initMeshes();
// initAxesHelper();
initCamera();
enableControls();

// init()
animate();

window.addEventListener( 'resize', onWindowResize );

// 初始化场景渲染器
function initRenderer() {
  renderer=new THREE.WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  document.body.appendChild( renderer.domElement );

  //创建环境效果
  pmremGenerator=new THREE.PMREMGenerator(renderer);


}

function initScene() {
  scene=new THREE.Scene();
}

function initMeshes(){
  //太阳
  sun=new THREE.Vector3(-80,5,-100);
  //设置水特效
  water=new Water( //bufferGeometry, ShaderMaterial
    new THREE.PlaneGeometry(10000,10000),
    { //options
      textureWidth:512,
      textureHeight:512,
      waterNormals:new THREE.TextureLoader().load(
        './src\\assets\\three.js-master-master\\examples\\textures/waternormals.jpg',
        function (texture){
          texture.wrapS = texture.wrapT=THREE.RepeatWrapping;

        }
      ),
      sunDirection:sun,
      sunColor:0x001133,
      waterColor:0x000a1a,
      distortionScale:2.0,
      fog:scene.fog!==undefined,
      alpha:0.1,

    }
  );
  console.log(water);
  water.rotation.x=-Math.PI/2;
  scene.add(water);

  sunParms={
    elevation:2, //极角，维度
    azimuth:-150, //方位角，经度
  }
  //天空
  sky=new Sky();
  sky.scale.setScalar(10000)
  scene.add(sky);

  const skyUniforms=sky.material.uniforms;
  // skyUniforms['turbidity'].value=10;//天空浑浊度 fog
  skyUniforms['rayleigh'].value=1; //锐利值，光线柔和度
  console.log(skyUniforms)
  // skyUniforms['mieCoefficient'].value=0.005;
  // skyUniforms['mieDirectionalG'].value=0.8;
  //
  // sky.material.uniforms['rayleigh'].value = 0; // 降低光线散射
  // sky.material.uniforms['turbidity'].value = 20; // 增加浑浊度
  updateSun();


// 加载 OBJ 模型
  const mtlLoader= new MTLLoader()
  mtlLoader.load('test12.mtl',(materials) => {
    materials.preload();
    const objLoader = new OBJLoader();
    objLoader.setMaterials(materials);
    objLoader.load('test12.obj', (object) => {
      // 遍历模型子对象
      cube=object;
      // 放大模型 - 直接设置scale
      const scaleFactor = 20; // 放大10倍
      cube.scale.set(scaleFactor, scaleFactor, scaleFactor);
      cube.rotation.y=Math.PI/2;
      cube.position.y=10;
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
      scene.add(cube);
    });
  })
  console.log(cube)
  //添加GUI
  enableGUI();

}

function enableGUI(){
  gui=new GUI();
  // console.log(gui.domElement)
  gui.domElement.style.transform = `scale(${1})`;
  gui.domElement.style.transformOrigin = 'top right';
  const folderSun=gui.addFolder('Sun');
  folderSun.add(sunParms,'elevation',-60,90,0.001).onChange(updateSun);
  folderSun.add(sunParms,'azimuth',-180,180,0.01).onChange(updateSun);

  const waterParams=water.material.uniforms;
  const folderWater=gui.addFolder('Water');

  //设置水倒影反射程度
  folderWater.add(waterParams.distortionScale,'value',0,20,0.1).name('distortionScale');

  folderWater.add(waterParams.size,'value',0.1,20,0.1).name('size');

}

//配套太阳控制器
function updateSun(){
  const theta=THREE.MathUtils.degToRad(90-sunParms.elevation); //维度
  const phi=THREE.MathUtils.degToRad(sunParms.azimuth); //经度
  sun.setFromSphericalCoords(1,theta,phi)//球坐标系
  //更新时sky关联sun
  sky.material.uniforms['sunPosition'].value.copy(sun);

  //物体的反射效果
  if(renderTarget!==undefined){
    renderTarget.dispose();
  }
  renderTarget=pmremGenerator.fromScene(sky)
  scene.environment=renderTarget.texture;
}

function initAxesHelper() {
  scene.add(new THREE.AxesHelper(100));
}

function initCamera() {
  camera=new THREE.PerspectiveCamera(
    55,window.innerWidth / window.innerHeight,1,20000
  );
  camera.position.set(30, 30, 100);
}

function enableControls() {
  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0,10,0);
  // controls.enableZoom = false;
  // controls.enablePan = false;
  // controls.rotateSpeed-=0.25;
  // controls.enableDamping = true;
  controls.maxDistance=500.0;
  controls.minDistance=20.0;
  controls.update();
}



function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}


function render(){
  const time=window.performance.now()*0.001;
  // cube.position.y=Math.sin(time)*10+20;
  // cube.rotation.x=time*0.5;
  // cube.rotation.z=time*0.5;
  water.material.uniforms['time'].value+=1.0/60.0;
  renderer.render(scene,camera);

}
function animate() {
  requestAnimationFrame(animate);
  render();
}






</script>

<template>

</template>

<style scoped>

</style>

<script setup>
//shader实现Ocean效果
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {GUI} from "three/examples/jsm/libs/lil-gui.module.min.js"; //li-GUI
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader"
import { Water } from 'three/examples/jsm/objects/Water.js' //水库
import {Sky} from 'three/examples/jsm/objects/Sky.js' //天空

let camera,controls;
let renderer;
let scene;
let water,sun,sky,cube;
let pmremGenerator, renderTarget;

let sunParms,gui;
let spotLight,lightHelper;
let pointLight,pointHelper;

let zhu,mount;
let smokeParticles,clock,delta;

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
  clock = new THREE.Clock();
  //天空盒子
  const geometry = new THREE.BoxGeometry( 1000, 1000, 2000 );


  const material = new THREE.MeshPhongMaterial( {
    color: 0x10101,
    shininess: 10,
    specular: 0x111111,
    side: THREE.BackSide
  } );
  // const textures=getTexturesFromAtlasFile('sun_temple_stripe.jpg',6)
  // let material=[];
  // for ( let i = 0; i < 6; i ++ ) {
  //
  //   material.push( new THREE.MeshBasicMaterial( { map: textures[ i ] } ) );
  //
  // }

  const mesh = new THREE.Mesh( geometry, material );
  // mesh.geometry.scale( 1, 1, - 1 );
  mesh.position.y = 20;
  mesh.receiveShadow = true;
  scene.add( mesh );

  // scene.fog = new THREE.FogExp2(0x0a0a1a, 0.001); // 指数雾（颜色，密度）
  scene.fog = new THREE.Fog(0x0a0a1a, 1, 1000);
  //太阳
  sun=new THREE.Vector3(-80,5,-100);

  //设置水特效
  water=new Water( //bufferGeometry, ShaderMaterial
    new THREE.PlaneGeometry(1000,1500),
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
      sunColor:0x000000,
      waterColor:0x000000,
      distortionScale:11.3,
      fog:true,
      alpha:1,

    }
  );
  // console.log(water);
  water.rotation.x=-Math.PI/2;

  scene.add(water);

  sunParms={
    elevation:-20, //极角，维度
    azimuth:-150, //方位角，经度
  }

  // //天空
  sky=new Sky();
  sky.scale.setScalar(10000)
  // scene.add(sky);

  // const loader = new THREE.TextureLoader();
  // const filename =  './disturb.jpg'
  // const texture = loader.load( filename );
  // texture.minFilter = THREE.LinearFilter;
  // texture.magFilter = THREE.LinearFilter;
  // texture.generateMipmaps = false;
  // texture.colorSpace = THREE.SRGBColorSpace;
  //探照灯
  {
  spotLight = new THREE.SpotLight( 0x8086db, 63000 );
  spotLight.position.set( 5, 50, 30 );
  spotLight.angle = Math.PI / 6;
  spotLight.penumbra = 1;
  spotLight.decay = 1.8;
  spotLight.distance = 200;
  spotLight.angle = 0.8;

  spotLight.castShadow = true;
  spotLight.shadow.mapSize.width = 1024;
  spotLight.shadow.mapSize.height = 1024;
  spotLight.shadow.camera.near = 1;
  spotLight.shadow.camera.far = 80;
  spotLight.shadow.focus = 1;
  scene.add( spotLight );

  lightHelper = new THREE.SpotLightHelper( spotLight );
  scene.add( lightHelper );
  }
  // point lights
  pointLight = createLight( 0xb9a7e2 );

  pointLight.position.set( 0,48,-640);
  scene.add( pointLight );


  const skyUniforms=sky.material.uniforms;
  // skyUniforms['turbidity'].value=10;//天空浑浊度 fog
  skyUniforms['rayleigh'].value=0.017; //锐利值，光线柔和度

  // skyUniforms['exposure'].value=0.0;
  // skyUniforms['mieDirectionalG'].value=0.8;
  //
  // sky.material.uniforms['rayleigh'].value = 0; // 降低光线散射
  // sky.material.uniforms['turbidity'].value = 20; // 增加浑浊度
  updateSun();


  // 加载OBJ 模型
  const mtlLoader= new MTLLoader()
  mtlLoader.load('test13.mtl',(materials) => {
    materials.preload();
    const objLoader = new OBJLoader();
    objLoader.setMaterials(materials);
    objLoader.load('test13.obj', (object) => {
      if (object.children.length > 0) {
        console.log('✅ OBJ 文件正确加载，包含网格数:', object.children.length);
      } else {
        console.warn('⚠️ OBJ 文件加载成功，但可能为空');
      }

      // 遍历模型子对象
      cube=object;
      // 放大模型 - 直接设置scale
      const scaleFactor = 10; // 放大10倍
      cube.scale.set(scaleFactor, scaleFactor, scaleFactor);
      // 计算包围盒
      const box = new THREE.Box3().setFromObject(object);
      const size = new THREE.Vector3();
      box.getSize(size);

      console.log('📏 模型尺寸:', size,'📏 模型位置:', cube.position);

      // cube.rotation.y=Math.PI/2;
      cube.position.y+=size.y/2;
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

  // 加载远山
  const mount_mtlLoader= new MTLLoader()
  mount_mtlLoader.load('shan.mtl',(materials) => {
    materials.preload();
    const objLoader = new OBJLoader();
    objLoader.setMaterials(materials);
    objLoader.load('shan.obj', (object) => {
      if (object.children.length > 0) {
        console.log('✅ OBJ 文件正确加载，包含网格数:', object.children.length);
      } else {
        console.warn('⚠️ OBJ 文件加载成功，但可能为空');
      }

      // 遍历模型子对象
      mount=object;
      // 放大模型 - 直接设置scale
      const scaleFactor = 5; // 放大10倍
      mount.scale.set(scaleFactor, scaleFactor, scaleFactor);
      // 计算包围盒
      const box = new THREE.Box3().setFromObject(object);
      const size = new THREE.Vector3();
      box.getSize(size);

      console.log('📏 模型尺寸:', size,'📏 模型位置:', mount.position);

      // cube.rotation.y=Math.PI/2;
      mount.position.y+=size.y/2;
      mount.position.z=200;
      object.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          // 设置发光材质
          child.material = new THREE.MeshStandardMaterial({
            map: child.material.map || null,
            color:0x070b4b, // 紫色发光颜色
            emissive: 0x9670bd, // 自发光颜色
            emissiveIntensity: 0.155, // 发光强度
            metalness: 0.1,
            roughness: 0.1,
          });
          child.material.transparent=true;
          child.material.opacity=0.8;
          child.material.side=THREE.DoubleSide;
        }
      });
      scene.add(mount);
    });
  })

  //加载竹子
  const objLoader = new OBJLoader();
  objLoader.load('baboom.obj', (object) => {
    zhu = object.children[0];
    zhu.position.y+=5;
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        // 计算边界框
        child.geometry.computeBoundingBox();

        // 添加透明效果
        child.material = new THREE.MeshPhysicalMaterial({
          color: 0x06511c, // 竹子绿色
          transparent: true,
          opacity: 0.7, // 调整透明度（0.0 完全透明，1.0 完全不透明）
          side: THREE.DoubleSide, // 允许双面渲染
          emissive: 0x046c23, // 绿色自发光
          emissiveIntensity: 0.3, // 发光强度
          metalness: 0.2, // 轻微金属感
          roughness: 0.3, // 适当的粗糙度
          transmission: 0.7, // **玻璃材质的透光效果**
          clearcoat: 1.0, // 让表面更光滑
          clearcoatRoughness: 0.1,
        });
        // child.material.depthWrite = false; // 防止透明物体遮挡
      }
    });
    scene.add(zhu);
  });

  //加载烟雾
  const pnum=10;
  smokeParticles=createSmoke(pnum);
  for (let i=0;i<pnum;i++){
    scene.add(smokeParticles[i]);
  }


  //添加GUI
  enableGUI();

}

function createSmoke(pnum=10){
  const loader=new THREE.TextureLoader();
  const smokeTexture=loader.load("Smoke-Element.png");
  const smokeMaterial = new THREE.MeshLambertMaterial({
    color: new THREE.Color("rgb(255,255,255)"),
    map: smokeTexture,
    transparent: true,
    opacity:0.1,
    depthWrite: false, // 改善透明渲染
    blending: THREE.AdditiveBlending
  });
  const geometry = new THREE.PlaneGeometry(15, 10);
  smokeParticles=[];

  for (let p = 0; p < pnum; p++) {
    var particle = new THREE.Mesh(geometry, smokeMaterial);
    particle.position.set(
      Math.random() * 10-25,
      Math.random() *1.2,
      Math.random() * 2+1
    );
    particle.rotation.z = Math.random() * 360;
    // // particle.rotation.x = Math.random() * 5;
    // particle.rotation.y = Math.random() * 1;
    smokeParticles.push(particle);
  }
  console.log('载入烟雾');
  return smokeParticles;
};

function evolveSmoke() {
  let sp = smokeParticles.length;
  while (sp--) {
    smokeParticles[sp].rotation.z += Math.random()*delta * 0.05;
    // smokeParticles[sp].rotation.x += delta * 0.1;
  }
}

function createLight( color ) {

  const intensity = 20000;

  const light = new THREE.PointLight( color, intensity, 20 );
  light.castShadow = true;
  light.shadow.bias = - 0.005; // reduces self-shadowing on double-sided objects

  let geometry = new THREE.SphereGeometry( 200, 1000, 1000 );
  // let material = new THREE.MeshBasicMaterial( { color: 'yellow' } );
  // 3. 加载月亮贴图（不重复，完整包裹）
  const textureLoader = new THREE.TextureLoader();
  const moonTexture = textureLoader.load('./public/moon.jpg');

  // 4. 创建材质（禁用重复，启用环境光增强）
  const material = new THREE.MeshBasicMaterial({
    map: moonTexture,          // 月亮贴图
    transparent: true,         // 允许透明
    opacity: 0.7,             // 透明度
    side: THREE.DoubleSide,// 双面渲染
    color: new THREE.Color(0xb9a7e2),
    // emissive: new THREE.Color(color),  // 自发光颜色
    // emissiveIntensity: 0.3     // 发光强度
  });

  material.color.multiplyScalar( 5 );
  let sphere = new THREE.Mesh( geometry, material );


  light.add( sphere );

  return light;

}

function enableGUI(){
  gui=new GUI();
  // console.log(gui.domElement)
  gui.domElement.style.transform = `scale(${5})`;
  gui.domElement.style.transformOrigin = 'top right';
  const folderSun=gui.addFolder('Sun');
  folderSun.add(sunParms,'elevation',-60,90,0.001).onChange(updateSun);
  folderSun.add(sunParms,'azimuth',-180,180,0.01).onChange(updateSun);

  const params = {

    color: spotLight.color.getHex(),
    intensity: spotLight.intensity,
    distance: spotLight.distance,
    angle: spotLight.angle,
    penumbra: spotLight.penumbra,
    decay: spotLight.decay,
    focus: spotLight.shadow.focus,
    shadows: true,
    exposure:0.24, //0.165
  };

  const pointParams = {
    color: pointLight.color.getHex(),
    intensity: pointLight.intensity,
    distance: pointLight.distance,
    x:pointLight.position.x,
    y:pointLight.position.y,
    z:pointLight.position.z,
  }

  const folderpoint=gui.addFolder('pointLight');
  folderpoint.addColor(pointParams,'color').onChange(function(val){
    pointLight.color.setHex( val );
  });
  folderpoint.add(pointParams,'intensity',100,100000).onChange(function(val){
    pointLight.intensity=val;
  });
  folderpoint.add(pointParams,'distance',0, 2000 ).onChange(function(val){
    pointLight.distance=val;
  });
  folderpoint.add(pointParams,'x',-100, 100 ).onChange(function(val){
    pointLight.position.x=val;
  });
  folderpoint.add(pointParams,'y',-20, 400 ).onChange(function(val){
    pointLight.position.y=val;
  });
  folderpoint.add(pointParams,'z',-2000, 100 ).onChange(function(val){
    pointLight.position.z=val;
  });

  const folderspot=gui.addFolder('spotLight');
  folderspot.addColor( params, 'color' ).onChange( function ( val ) {

    spotLight.color.setHex( val );
    lightHelper.update();
    console.log(spotLight.color);

  } );
  folderspot.add(params,'exposure',0,1,0.001).onChange(function (val){
    renderer.toneMappingExposure=val
  });

  folderspot.add( params, 'intensity', 1000, 200000 ).onChange( function ( val ) {

    spotLight.intensity = val;

  } );
  folderspot.add( params, 'distance', 0, 500 ).onChange( function ( val ) {

    spotLight.distance = val;

    console.log(spotLight.distance)
  } );
  folderspot.add( params, 'angle', 0, Math.PI / 3 ).onChange( function ( val ) {

    spotLight.angle = val;

  } );
  folderspot.add( params, 'penumbra', 0, 1 ).onChange( function ( val ) {

    spotLight.penumbra = val;
    console.log(spotLight.penumbra);

  } );
  folderspot.add( params, 'decay', 1, 2 ).onChange( function ( val ) {

    spotLight.decay = val;
    console.log(spotLight.decay);
  } );
  folderspot.add( params, 'focus', 0, 5 ).onChange( function ( val ) {

    spotLight.shadow.focus = val;
    console.log(spotLight.shadow.focus);
  } );
  folderspot.add( params, 'shadows' ).onChange( function ( val ) {

    renderer.shadowMap.enabled = val;

    scene.traverse( function ( child ) {

      if ( child.material ) {

        child.material.needsUpdate = true;

      }

    } );

  } );


  const waterParams=water.material.uniforms;
  const folderWater=gui.addFolder('Water');
  console.log(waterParams);
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
  //
  // sky.material.uniforms['turbidity']=0.1;
  sky.material.uniforms['rayleigh']=0.17;
  renderer.toneMappingExposure=0.23;
  sky.material.uniforms['mieCoefficient']=0.004;

  //物体的反射效果
  if(renderTarget!==undefined){
    renderTarget.dispose();
  }
  renderTarget=pmremGenerator.fromScene(sky)
  scene.environment=renderTarget.texture;

}

function initCamera() {
  camera=new THREE.PerspectiveCamera(
    55,window.innerWidth / window.innerHeight,1,20000
  );
  camera.position.set(0, 10, 100);
}

function enableControls() {
  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0,10,0);
  // controls.enableZoom = false;
  // controls.enablePan = false;
  // controls.rotateSpeed-=0.25;
  // controls.enableDamping = true;
  // controls.maxDistance=1000.0;
  // controls.minDistance=20.0;
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
  evolveSmoke(time)

  renderer.render(scene,camera);
  pointLight.rotationY+=0.0001;

}
function animate() {
  delta = clock.getDelta();
  requestAnimationFrame(animate);
  lightHelper.update();
  // pointHelper.update();
  render();
}






</script>

<template>

</template>

<style scoped>

</style>

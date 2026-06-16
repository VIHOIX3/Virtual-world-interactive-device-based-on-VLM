<script setup>
//shader实现Ocean效果
import * as THREE from 'three';
import {OBJLoader} from 'three/examples/jsm/loaders/OBJLoader.js';
import {MTLLoader} from 'three/examples/jsm/loaders/MTLLoader.js';

import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';

import {Water} from 'three/examples/jsm/objects/Water.js' //水库
import {Sky} from 'three/examples/jsm/objects/Sky.js' //天空
import snoise from './lib/noise/snoise.glsl?raw';
import {EffectComposer, RenderPass, OutputPass, UnrealBloomPass, ShaderPass} from 'three/examples/jsm/Addons.js';
import Stats from 'three/examples/jsm/libs/stats.module.js'
import {GUI} from "three/examples/jsm/libs/lil-gui.module.min.js"; //li-GUI

let camera, controls;
let renderer;
let scene;
let water, sun, sky;



let spotLight;
let pointLight;

let  mount;
let clock;



let model_list = []
let gui

let de1,de2,de3;
let dissolveEffect_list=[];
let particles_flag= {'id':-1,'type':false};

class ModelDissolveEffect {
  constructor(scene, renderer, camera,id) {
    // console.log(camera)
    this.scene = scene;
    // this.bloomscene=bloomscene;
    this.renderer = renderer;
    this.camera = camera;
    this.mesh = null;
    this.particleMesh = null;
    this.effectComposer = null;
    this.bloomLayer = new THREE.Layers();
    this.id=id;
    // this.bloomLayer.set(2); // 使用图层1作为泛光层
    // // 泛光效果
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.4, 0.20, 0.02
    );
    this.path=null;

    // 初始化溶解效果参数
    this.dissolveUniformData = {
      uEdgeColor: {value: new THREE.Color(0x4d9bff)},
      uFreq: {value: 0.20},
      uAmp: {value: 16.0},
      uProgress: {value: 19.0},
      uEdge: {value: 2}
    };

    // 初始化粒子效果参数
    this.particleData = {
      particleSpeedFactor: 0.08,
      velocityFactor: {x: 3, y: 2., z: 1.5},
      waveAmplitude: 0.15,
    };

    // 初始化粒子属性
    this.particleCount = 0;
    this.particleMaxOffsetArr = null;
    this.particleInitPosArr = null;
    this.particleCurrPosArr = null;
    this.particleVelocityArr = null;
    this.particleDistArr = null;
    this.particleRotationArr = null;

    this.setupEffects();
  }

  // 设置后期效果
  setupEffects() {
    this.effectComposer = new EffectComposer(this.renderer);
    const renderPass = new RenderPass(this.scene, this.camera);


    // 着色器效果
    const shaderPass = new ShaderPass(
      new THREE.ShaderMaterial({
        uniforms: {
          tDiffuse: {value: null},
          uBloomTexture: {value: null},
          uStrength: {value: 20.00},
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
          }
        `,
        fragmentShader: `
          uniform sampler2D tDiffuse;
          uniform sampler2D uBloomTexture;
          uniform float uStrength;
          varying vec2 vUv;
          void main() {
            vec4 baseEffect = texture2D(tDiffuse,vUv);
            vec4 bloomEffect = texture2D(uBloomTexture,vUv);
            gl_FragColor = baseEffect + bloomEffect * uStrength;
          }
        `,
      })
    );

    this.effectComposer.addPass(renderPass);
    this.effectComposer.addPass(this.bloomPass);
    this.effectComposer.addPass(shaderPass);
    this.effectComposer.addPass(new OutputPass());

  }

  // 加载模型并设置溶解效果
  async loadModel(modelPath, scaleFactor = 1.0,pos=new THREE.Vector3(0,0,0)) {
    try {
      // 加载模型
      this.path=modelPath;
      const objLoader = new OBJLoader();
      const mtlLoader = new MTLLoader();

      // 尝试加载材质文件
      const mtlFile = modelPath.replace('.obj', '.mtl');
      let materials = null;

      try {
        materials = await new Promise((resolve, reject) => {
          mtlLoader.load(mtlFile, resolve, null, reject);
        });
        materials.preload();
        objLoader.setMaterials(materials);
      } catch (e) {
        // console.log('没有找到材质文件，将使用默认材质');
      }

      // 加载模型
      const object = await new Promise((resolve, reject) => {
        objLoader.load(modelPath, resolve, null, reject);
      });

      if (object.children.length === 0) {
        throw new Error('加载的模型没有子对象');
      }

      const model = object.children[0];
      const geometry = model.geometry;

      // 创建溶解网格
      this.mesh = this.createDissolveMesh(geometry, model.material);
      this.mesh.scale.set(scaleFactor, scaleFactor, scaleFactor);
      const box = new THREE.Box3().setFromObject(this.mesh);
      const size = new THREE.Vector3();
      box.getSize(size);

      // console.log('📏 模型尺寸:', size, '📏 模型位置:', this.mesh.position);

      this.mesh.position.x+=pos.x
      this.mesh.position.y+=pos.y
      this.mesh.position.z+=pos.z

      this.mesh.position.y += size.y / 1.5;

      this.scene.add(this.mesh);

      // 初始化粒子系统
      this.initParticleSystem(geometry,size.y / 1.5, scaleFactor);

      // this.mesh.layers.set(1)
      // this.particleMesh.layers.set(1)
      this.particleMesh.position.x+=pos.x
      this.particleMesh.position.y+=pos.y
      this.particleMesh.position.z+=pos.z

      return this.mesh;
    } catch (error) {
      console.error('加载模型失败:', error);
      throw error;
    }
  }

  // 创建溶解网格
  createDissolveMesh(geometry, material) {
    // 使用提供的材质或创建默认材质
    let dissolveMaterial;
    if (material) {
      dissolveMaterial = material.clone();
      // 保留原始贴图但增强发光效果
      dissolveMaterial.emissive = new THREE.Color(0x4d9bff);
      dissolveMaterial.emissiveIntensity = 8;
      dissolveMaterial.emissiveMap = material.map; // 使用原始贴图作为发光贴图
      dissolveMaterial.opacity=0.8
    } else {
      dissolveMaterial = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(0x636363),
        metalness: 2.0,
        roughness: 0.0,
        side: THREE.DoubleSide,
        emissive: 0x4d9bff,
        emissiveIntensity: 1, // 发光强度
      });
    }

    // 设置着色器修改
    dissolveMaterial.onBeforeCompile = (shader) => {
      // 添加uniforms
      for (let key in this.dissolveUniformData) {
        shader.uniforms[key] = this.dissolveUniformData[key];
      }

      // 修改顶点着色器
      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        `#include <common>\nvarying vec3 vPos;`
      );
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>\nvPos = position;`
      );

      // 修改片段着色器
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <common>',
        `#include <common>
        varying vec3 vPos;
        uniform float uFreq;
        uniform float uAmp;
        uniform float uProgress;
        uniform float uEdge;
        uniform vec3 uEdgeColor;
        ${snoise}
        `
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <dithering_fragment>',
        `#include <dithering_fragment>
        float noise = snoise(vPos * uFreq) * uAmp;
        if(noise < uProgress) discard;
        float edgeWidth = uProgress + uEdge;
        if(noise > uProgress && noise < edgeWidth){
            gl_FragColor = vec4(vec3(uEdgeColor), noise);
        } else {
            gl_FragColor = vec4(gl_FragColor.xyz, 1.0);
        }
        `
      );
    };

    const mesh = new THREE.Mesh(geometry, dissolveMaterial);
    mesh.userData.dissolveUniformsData = this.dissolveUniformData;
    mesh.userData.dissolving = false;

    return mesh;
  }

  // 初始化粒子系统
  initParticleSystem(geometry,yshift, scaleFactor) {
    this.particleCount = geometry.attributes.position.count;

    // 初始化粒子属性数组
    const originalPositions = geometry.getAttribute('position').array;
    this.particleInitPosArr = new Float32Array(originalPositions.length);
    this.particleCurrPosArr = new Float32Array(originalPositions.length);

    for (let i = 0; i < originalPositions.length; i++) {
      if(i%3==1){
        this.particleInitPosArr[i] = originalPositions[i] * scaleFactor+yshift;
        this.particleCurrPosArr[i] = originalPositions[i] * scaleFactor+yshift;
      }
      else{
        this.particleInitPosArr[i] = originalPositions[i] * scaleFactor;
        this.particleCurrPosArr[i] = originalPositions[i] * scaleFactor;
      }

    }

    this.particleMaxOffsetArr = new Float32Array(this.particleCount);
    this.particleVelocityArr = new Float32Array(this.particleCount * 3);
    this.particleDistArr = new Float32Array(this.particleCount);
    this.particleRotationArr = new Float32Array(this.particleCount);

    // 随机初始化粒子属性
    for (let i = 0; i < this.particleCount; i++) {
      let x = i * 3 + 0;
      let y = i * 3 + 1;
      let z = i * 3 + 2;

      this.particleMaxOffsetArr[i] = Math.random() * 8 + 3;

      this.particleVelocityArr[x] = Math.random() * 1 + 0.5;
      this.particleVelocityArr[y] = Math.random() * 1 + 0.5;
      this.particleVelocityArr[z] = Math.random() * 0.6 + 0.5;

      this.particleDistArr[i] = 0.001;
      this.particleRotationArr[i] = Math.random() * Math.PI * 2;
    }

    // 设置几何体属性
    geometry.setAttribute('aOffset', new THREE.BufferAttribute(this.particleMaxOffsetArr, 1));
    geometry.setAttribute('aCurrentPos', new THREE.BufferAttribute(this.particleCurrPosArr, 3));
    geometry.setAttribute('aVelocity', new THREE.BufferAttribute(this.particleVelocityArr, 3));
    geometry.setAttribute('aDist', new THREE.BufferAttribute(this.particleDistArr, 1));
    geometry.setAttribute('aAngle', new THREE.BufferAttribute(this.particleRotationArr, 1));

    // 创建粒子材质
    const particleTexture = new THREE.TextureLoader().load('particle.png');
    const particleUniforms = {
      uTexture: {value: particleTexture},
      uPixelDensity: {value: this.renderer.getPixelRatio()},
      uProgress: this.dissolveUniformData.uProgress,
      uEdge: this.dissolveUniformData.uEdge,
      uAmp: this.dissolveUniformData.uAmp,
      uFreq: this.dissolveUniformData.uFreq,
      uBaseSize: {value: 240},
      uColor: {value: new THREE.Color(0x4d9bff)}
    };

    const particleMat = new THREE.ShaderMaterial({
      uniforms: particleUniforms,
      vertexShader: `
        ${snoise}
        uniform float uPixelDensity;
        uniform float uBaseSize;
        uniform float uFreq;
        uniform float uAmp;
        uniform float uEdge;
        uniform float uProgress;

        varying float vNoise;
        varying float vAngle;

        attribute vec3 aCurrentPos;
        attribute float aDist;
        attribute float aAngle;

        void main() {
            vec3 pos = position;

            float noise = snoise(pos * uFreq) * uAmp;
            vNoise = noise;

            vAngle = aAngle;

            if( vNoise > uProgress-2.0 && vNoise < uProgress + uEdge+2.0){
                pos = aCurrentPos;
            }

            vec4 modelPosition = modelMatrix * vec4(pos, 1.0);
            vec4 viewPosition = viewMatrix * modelPosition;
            vec4 projectedPosition = projectionMatrix * viewPosition;
            gl_Position = projectedPosition;

            float size = uBaseSize * uPixelDensity;
            size = size  / (aDist + 1.0);
            gl_PointSize = size / -viewPosition.z;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uEdge;
        uniform float uProgress;
        uniform sampler2D uTexture;

        varying float vNoise;
        varying float vAngle;

        void main() {
            if( vNoise < uProgress ) discard;
            if( vNoise > uProgress + uEdge) discard;

            vec2 coord = gl_PointCoord;
            coord = coord - 0.5;
            coord = coord * mat2(cos(vAngle),sin(vAngle) , -sin(vAngle), cos(vAngle));
            coord = coord + 0.5;

            vec4 texture = texture2D(uTexture,coord);
            gl_FragColor = vec4(vec3(uColor.xyz * texture.xyz),1.0);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending
    });

    // 创建粒子网格
    this.particleMesh = new THREE.Points(geometry, particleMat);

  }

  // 更新粒子系统
  updateParticles() {
    for (let i = 0; i < this.particleCount; i++) {
      let x = i * 3 + 0;
      let y = i * 3 + 1;
      let z = i * 3 + 2;

      // 更新速度
      let {vx, vy, vz} = this.calculateParticleVelocity(i);

      // 更新位置
      this.particleCurrPosArr[x] += vx;
      this.particleCurrPosArr[y] += vy;
      this.particleCurrPosArr[z] -= vz;

      // 计算距离
      const vec1 = new THREE.Vector3(
        this.particleInitPosArr[x],
        this.particleInitPosArr[y],
        this.particleInitPosArr[z]
      );
      const vec2 = new THREE.Vector3(
        this.particleCurrPosArr[x],
        this.particleCurrPosArr[y],
        this.particleCurrPosArr[z]
      );
      const dist = vec1.distanceTo(vec2);

      this.particleDistArr[i] = dist;
      this.particleRotationArr[i] += 0.01;

      // 如果粒子移动太远，重置位置
      if (dist > this.particleMaxOffsetArr[i]) {
        this.particleCurrPosArr[x] = this.particleInitPosArr[x];
        this.particleCurrPosArr[y] = this.particleInitPosArr[y];
        this.particleCurrPosArr[z] = this.particleInitPosArr[z];
      }
    }

    // 更新几何体属性
    this.mesh.geometry.setAttribute('aCurrentPos', new THREE.BufferAttribute(this.particleCurrPosArr, 3));
    this.mesh.geometry.setAttribute('aDist', new THREE.BufferAttribute(this.particleDistArr, 1));
    this.mesh.geometry.setAttribute('aAngle', new THREE.BufferAttribute(this.particleRotationArr, 1));
  }

  // 计算粒子速度
  calculateParticleVelocity(idx) {
    let vx = this.particleVelocityArr[idx * 3 + 0];
    let vy = this.particleVelocityArr[idx * 3 + 1];
    let vz = this.particleVelocityArr[idx * 3 + 2];

    vx *= this.particleData.velocityFactor.x;
    vy *= this.particleData.velocityFactor.y;
    vz *= this.particleData.velocityFactor.z;

    // 添加波形效果
    const {xwave, ywave} = this.calculateWaveOffset(idx);
    vx += xwave;
    vy += ywave;
    vz += ywave;

    // 应用速度因子
    vx *= Math.abs(this.particleData.particleSpeedFactor);
    vy *= Math.abs(this.particleData.particleSpeedFactor);
    vz *= Math.abs(this.particleData.particleSpeedFactor);

    return {vx, vy, vz};
  }

  // 计算波形偏移
  calculateWaveOffset(idx) {
    const posx = this.particleCurrPosArr[idx * 3 + 0];
    const posy = this.particleCurrPosArr[idx * 3 + 1];

    let xwave1 = Math.sin(posy * 2) * (0.8 + this.particleData.waveAmplitude);
    let ywave1 = Math.sin(posx * 2) * (0.6 + this.particleData.waveAmplitude);

    let xwave2 = Math.sin(posy * 5) * (0.2 + this.particleData.waveAmplitude);
    let ywave2 = Math.sin(posx * 1) * (0.9 + this.particleData.waveAmplitude);

    let xwave3 = Math.sin(posy * 8) * (0.8 + this.particleData.waveAmplitude);
    let ywave3 = Math.sin(posx * 5) * (0.6 + this.particleData.waveAmplitude);

    let xwave4 = Math.sin(posy * 3) * (0.8 + this.particleData.waveAmplitude);
    let ywave4 = Math.sin(posx * 7) * (0.6 + this.particleData.waveAmplitude);

    let xwave = xwave1 + xwave2 + xwave3 + xwave4;
    let ywave = ywave1 + ywave2 + ywave3 + ywave4;

    return {xwave, ywave};
  }

  // 更新溶解动画
  updateDissolve() {
    const uniforms = this.mesh.userData.dissolveUniformsData;

    if (this.mesh.userData.dissolving) {
      //消失，需要抢占令牌

      if(particles_flag['id']===this.id&&particles_flag['type']===true) {

        uniforms.uProgress.value += 0.04;
        if (uniforms.uProgress.value > 14) {
          //当溶解完成，移除粒子渲染，释放token，改type为ture，释放id
          scene.remove(this.particleMesh);
          particles_flag['type']=false;
          particles_flag['id']=-1;
          this.mesh.userData.dissolving = false;
        }
      }
    } else {
      //出现,不需要抢占令牌
      uniforms.uProgress.value -= 0.04;
      if (uniforms.uProgress.value < -17) {
        this.mesh.userData.dissolving = true;
      }
    }
  }

  // 渲染场景
  render() {

    if (this.mesh) {

      this.updateDissolve();
      //当前处于溶解状态
      if (this.mesh.userData.dissolving){
        //当前是否可以抢占令牌
        // console.log(particles_flag['id'],particles_flag['type'],this.mesh.userData.dissolveUniformsData.uProgress);
        if (particles_flag['type']===false&&particles_flag['id']===-1){
          particles_flag['type']=true;
          particles_flag['id']=this.id;
        }else {
          return;
        }
        //判断是否抢占令牌成功
        if(particles_flag['type']===true&&particles_flag['id']===this.id){
          scene.add(this.particleMesh);
          console.log('带粒子溶解：',particles_flag['id'],particles_flag['type'],this.mesh.userData.dissolveUniformsData.uProgress);
          this.updateParticles();
        }
      }

    }

  }
  ecrender(){
    this.effectComposer.render();
  }
}


initRenderer();
initScene();

// initAxesHelper();
initCamera();
initMeshes();
enableControls();

window.addEventListener('resize', onWindowResize);
let moonLight
// 引入stats.js
let timestamp;
const stats = new Stats()
// 设置stats样式
stats.dom.style.position = 'absolute';
stats.dom.style.top = '0px';
document.body.appendChild(stats.dom);

// 初始化场景渲染器
function initRenderer() {
  renderer = new THREE.WebGLRenderer({
    powerPreference:"high-performance",

  });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  document.body.appendChild(renderer.domElement);


}

function initScene() {
  scene = new THREE.Scene();
}

function initMeshes() {
  clock = new THREE.Clock();

  renderer.toneMappingExposure = 0.23;
  const geometry = new THREE.BoxGeometry(1600, 1600, 1600);

// 纹理加载器
  const textureLoader = new THREE.TextureLoader();

// 六张贴图的URL数组
  const textureUrls = [
    'nx.png',   // 右面 (X+)
    'px.png',    // 左面 (X-)
    'ny.png',     // 顶面 (Y+)
    'py.png',  // 底面 (Y-)
    'nz.png',   // 前面 (Z+)
    'pz.png'     // 后面 (Z-)
  ];

// 创建材质数组
  const materials = textureUrls.map(url => {
    const texture = textureLoader.load(url, undefined, undefined, (error) => {
      console.error('Error loading texture:', error);
    });

    return new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.BackSide
    });
  });

// 创建网格
  const mesh = new THREE.Mesh(geometry, materials);
  mesh.position.y = 20;
  mesh.receiveShadow = true;
  scene.add(mesh);

  // 雾
  scene.fog = new THREE.Fog(0x0a0a1a, 1, 800);
  //太阳
  sun = new THREE.Vector3(-80, 5, -100);

  //水
  water = new Water( //bufferGeometry, ShaderMaterial
    new THREE.PlaneGeometry(1000, 1500),
    { //options
      textureWidth: 512,
      textureHeight: 512,
      waterNormals: new THREE.TextureLoader().load(
        './src\\assets\\three.js-master-master\\examples\\textures/waternormals.jpg',
        function (texture) {
          texture.wrapS = texture.wrapT = THREE.RepeatWrapping;

        }
      ),
      sunDirection: sun,
      sunColor: 0x000000,
      waterColor: 0x000000,
      distortionScale: 11.3,
      fog: true,
      alpha: 1,
      opacity:1.,

    }
  );
  water.rotation.x = -Math.PI / 2;
  scene.add(water);

  //光纤
  {
    spotLight = new THREE.SpotLight(0x8086db, 16500);
    spotLight.position.set(5, 50, 30);
    spotLight.angle = 1.6;
    spotLight.penumbra = 1;
    spotLight.decay = 1.8;
    spotLight.distance = 400;

    spotLight.castShadow = true;
    spotLight.shadow.mapSize.width = 1024;
    spotLight.shadow.mapSize.height = 1024;
    spotLight.shadow.camera.near = 1;
    spotLight.shadow.camera.far = 80;
    spotLight.shadow.focus = 1;
    scene.add(spotLight);

    // lightHelper = new THREE.SpotLightHelper(spotLight);
    // scene.add(lightHelper);
  }
  // point lights
  pointLight = createLight(0xb9a7e2);

  pointLight.position.set(0, 48, -640);
  scene.add(pointLight);



  // 加载远山
  const mount_mtlLoader = new MTLLoader()
  mount_mtlLoader.load('shan.mtl', (materials) => {
    materials.preload();
    const objLoader = new OBJLoader();
    objLoader.setMaterials(materials);
    objLoader.load('shan.obj', (object) => {
      if (object.children.length > 0) {

      } else {
        console.warn('⚠️ OBJ 文件加载成功，但可能为空');
      }

      // 遍历模型子对象
      mount = object;
      // 放大模型 - 直接设置scale
      const scaleFactor = 5; // 放大10倍
      mount.scale.set(scaleFactor, scaleFactor, scaleFactor);
      // 计算包围盒
      const box = new THREE.Box3().setFromObject(object);
      const size = new THREE.Vector3();
      box.getSize(size);

      mount.position.y += size.y / 2;
      mount.position.z = 250;
      object.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          // 设置发光材质
          child.material = new THREE.MeshStandardMaterial({
            map: child.material.map || null,
            color: 0x1F2544, // 紫色发光颜色
            emissive: 0x9670bd, // 自发光颜色
            emissiveIntensity: 0.155, // 发光强度
            metalness: 0.1,
            roughness: 0.1,
          });
          child.material.transparent = true;
          child.material.opacity = 0.9;
          child.material.side = THREE.DoubleSide;
        }
      });
      scene.add(mount);

      addMoonlight(mount, size);
    });
  })

  function addMoonlight(mountain, mountainSize) {
    // 1. 创建月光（平行光，模拟月光）
    moonLight = new THREE.DirectionalLight(0xFFE3F4, 5); // 月光颜色（冷蓝色）
    moonLight.position.set(
        -102, // 从山背面左侧照射
        -13, // 高于山顶
        -400 // 从山背面远处照射
    );

    // 设置光的target指向山顶区域
    moonLight.target.position.set(
        mountain.position.x,
        mountain.position.y + mountainSize.y * 0.7,
        -220
    );

    // 将target添加到场景
    scene.add(moonLight.target);

    // 设置阴影相机范围，使光只在远处生效
    moonLight.castShadow = true;
    moonLight.shadow.camera.near = 10;  // 光从100单位距离开始生效
    moonLight.shadow.camera.far = 50;   // 光到500单位距离结束

    // // 设置光的阴影（如果需要）
    // moonLight.castShadow = true;
    // moonLight.shadow.mapSize.width = 2048;
    // moonLight.shadow.mapSize.height = 2048;
    scene.add(moonLight);
  }

  {
    const grass_urls = import.meta.glob('./assets/草/*.obj', {
      as: 'url' // 告诉 Vite 返回资源路径（而不是模块）
    });
    //加载对应模块
    for (const path in grass_urls) {
      grass_urls[path]().then((url) => {

        model_list.push(loadOneWithMat(url, '333.jpg', 'grass', 7.5, 3));
      });
    }

    const ligh_urls = import.meta.glob('./assets/灯/*.obj', {
      as: 'url' // 告诉 Vite 返回资源路径（而不是模块）
    });
    //加载对应模块
    for (const path in ligh_urls) {
      ligh_urls[path]().then((url) => {

        model_list.push(loadOneWithMat(url, 'src/assets/灯/deng.jpg', 'light', 7.5, 3));
      });
    }

    const flower_urls = import.meta.glob('./assets/花/*.obj', {
      as: 'url' // 告诉 Vite 返回资源路径（而不是模块）
    });
    //加载对应模块
    for (const path in flower_urls) {
      flower_urls[path]().then((url) => {

        model_list.push(loadOneWithMat(url, '333.jpg', 'flower', 7.5, 3));
      });
    }

    const plant_urls = import.meta.glob('./assets/植物/*.obj', {
      as: 'url' // 告诉 Vite 返回资源路径（而不是模块）
    });
    //加载对应模块
    for (const path in plant_urls) {
      plant_urls[path]().then((url) => {

        model_list.push(loadOneWithMat(url, '333.jpg', 'plant', 7.5, 3));
      });
    }

    const bamboo_urls = import.meta.glob('./assets/竹子/*.obj', {
      as: 'url' // 告诉 Vite 返回资源路径（而不是模块）
    });
    //加载对应模块
    for (const path in bamboo_urls) {
      bamboo_urls[path]().then((url) => {

        model_list.push(loadOneWithMat(url, '333.jpg', 'bamboo', 7.5, 3));
      });
    }

    const stone_urls = import.meta.glob('./assets/石头/*.obj', {
      as: 'url' // 告诉 Vite 返回资源路径（而不是模块）
    });
    //加载对应模块
    for (const path in stone_urls) {
      stone_urls[path]().then((url) => {

        model_list.push(loadOneWithMat(url, 'src/assets/石头/1.png', 'stone', 7.5, 3));
      });
    }

    const dec_urls = import.meta.glob('./assets/装饰/*.obj', {
      as: 'url' // 告诉 Vite 返回资源路径（而不是模块）
    });
    //加载对应模块
    for (const path in dec_urls) {
      dec_urls[path]().then((url) => {

        model_list.push(loadOneWithMat(url, '333.jpg', 'ting', 7.5, 3));
      });
    }

    const ground_urls = import.meta.glob('./assets/岛1/*.obj', {
      as: 'url' // 告诉 Vite 返回资源路径（而不是模块）
    });
    //加载对应模块
    for (const path in ground_urls) {
      ground_urls[path]().then((url) => {

        model_list.push(loadOneWithMat(url, 'src/assets/岛1/grass.png', 'ground', 8, 3));
      });
    }

    const zhou_urls = import.meta.glob('./assets/洲/*.obj', {
      as: 'url' // 告诉 Vite 返回资源路径（而不是模块）
    });
    //加载对应模块
    for (const path in zhou_urls) {
      zhou_urls[path]().then((url) => {

        model_list.push(loadOneWithMat(url, 'src/assets/岛1/grass.png', 'ground', 7.5, 88, 55));
      });
    }

    const zhouting_urls = import.meta.glob('./assets/洲亭/*.obj', {
      as: 'url' // 告诉 Vite 返回资源路径（而不是模块）
    });
    //加载对应模块
    for (const path in zhouting_urls) {
      zhouting_urls[path]().then((url) => {
        model_list.push(loadOneWithMat(url, 'src/assets/洲亭/1.jpg', 'zhouting', 7.5, 88, 55));
      });
    }

    const zhouzhi_urls = import.meta.glob('./assets/洲植/*.obj', {
      as: 'url' // 告诉 Vite 返回资源路径（而不是模块）
    });
    //加载对应模块
    for (const path in zhouzhi_urls) {
      zhouzhi_urls[path]().then((url) => {
        model_list.push(loadOneWithMat(url, '333.jpg', 'grass', 7.5, 88, 55));
      });
    }

    const lian_urls = import.meta.glob('./assets/莲花/*.obj', {
      as: 'url' // 告诉 Vite 返回资源路径（而不是模块）
    });
    //加载对应模块
    for (const path in lian_urls) {
      lian_urls[path]().then((url) => {

        model_list.push(loadOneWithMat(url, 'src/assets/莲花/lian1.jpg', 'lian', 8, 7, 12));
      });
    }

    const zh_urls = import.meta.glob('./assets/zihua/*.obj', {
      as: 'url' // 告诉 Vite 返回资源路径（而不是模块）
    });
    //加载对应模块
    for (const path in zh_urls) {
      zh_urls[path]().then((url) => {

        model_list.push(loadOneWithMat(url, 'src/assets/zihua/zihua.jpg', 'lian', 10, 3));
      });
    }

    const deng_urls = import.meta.glob('./assets/cao 3/*.obj', {
      as: 'url' // 告诉 Vite 返回资源路径（而不是模块）
    });
    //加载对应模块
    for (const path in deng_urls) {
      deng_urls[path]().then((url) => {

        model_list.push(loadOneWithMat(url, 'src/assets/cao 3/cao3.jpg', 'grass', 7.5, 3));
      });
    }

    const miaourls = import.meta.glob('./assets/长苗/*.obj', {
      as: 'url' // 告诉 Vite 返回资源路径（而不是模块）
    });
    //加载对应模块
    for (const path in miaourls) {
      miaourls[path]().then((url) => {

        model_list.push(loadOneWithMat(url, 'src/assets/长苗/lef2.jpg', 'miao', 7.5, 3));
      });
    }

    const temp = import.meta.glob('./assets/亭子/*.obj', {
      as: 'url' // 告诉 Vite 返回资源路径（而不是模块）
    });
    //加载对应模块
    for (const path in temp) {
      temp[path]().then((url) => {

        model_list.push(loadOneWithMat(url, '333.jpg', 'ting', 7.5, 3));
      });
    }
  }

  {
  de1= new ModelDissolveEffect(scene, renderer, camera,1);
  let pos1=new THREE.Vector3(10,0,16)
  de1.loadModel('test13.obj', 5.0,pos1)
    .then((obj) => {

      dissolveEffect_list.push(de1);

    })
    .catch(error => {
      console.error('加载模型失败:', error);
    });

  de2= new ModelDissolveEffect(scene, renderer, camera,2);
  let pos2=new THREE.Vector3(35,0,13)
  de2.loadModel('test12.obj', 5.0,pos2)
    .then((obj) => {
      dissolveEffect_list.push(de2);
      animate();
    })
    .catch(error => {
      console.error('加载模型失败:', error);
    });

  de3= new ModelDissolveEffect(scene, renderer, camera,3);
  let pos3=new THREE.Vector3(-1,1,5)
  de3.loadModel('test11.obj', 4.0,pos3)
    .then((obj) => {
      dissolveEffect_list.push(de3);

      // console.log(obj.position)
      // animate();
    })
    .catch(error => {
      console.error('加载模型失败:', error);
    });

  const de4= new ModelDissolveEffect(scene, renderer, camera,4);
  let pos4=new THREE.Vector3(-33,0,8)
  de3.loadModel('test1.obj', 5.0,pos4)
      .then((obj) => {
        dissolveEffect_list.push(de4);
        console.log('模型加载完成');
        console.log(obj.position)
        // animate();
      })
      .catch(error => {
        console.error('加载模型失败:', error);
      });

  const de5= new ModelDissolveEffect(scene, renderer, camera,5);
  let pos5=new THREE.Vector3(-9,-1,25)
  de5.loadModel('test1.obj', 5.0,pos5)
      .then((obj) => {
        dissolveEffect_list.push(de5);
        console.log('模型加载完成');
        console.log(obj.position)
        // animate();
      })
      .catch(error => {
        console.error('加载模型失败:', error);
      });

  // const de6= new ModelDissolveEffect(scene, renderer, camera,6);
  // let pos6=new THREE.Vector3(28,0,-26)
  // de6.loadModel('test7.obj', 5.0,pos6)
  //     .then((obj) => {
  //       dissolveEffect_list.push(de6);
  //       console.log('模型加载完成');
  //       console.log(obj.position)
  //       animate();
  //     })
  //     .catch(error => {
  //       console.error('加载模型失败:', error);
  //     });

  const de7= new ModelDissolveEffect(scene, renderer, camera,7);
  let pos7=new THREE.Vector3(-75,0,-30)
  de7.loadModel('test9.obj', 5.0,pos7)
      .then((obj) => {
        dissolveEffect_list.push(de7);
        // console.log(obj.position)
        // animate();
      })
      .catch(error => {
        console.error('加载模型失败:', error);
      });

  const de8= new ModelDissolveEffect(scene, renderer, camera,8);
  let pos8=new THREE.Vector3(-45,0,-20)
  de8.loadModel('test14.obj', 6.0,pos8)
      .then((obj) => {
        dissolveEffect_list.push(de8);

        // console.log(obj.position)
        // animate();
      })
      .catch(error => {
        console.error('加载模型失败:', error);
      });

  const de9= new ModelDissolveEffect(scene, renderer, camera,9);
  let pos9=new THREE.Vector3(-29,0,-40)
  de9.loadModel('test15.obj', 5.0,pos9)
      .then((obj) => {
        dissolveEffect_list.push(de9);

        // console.log(obj.position)
        // animate();
      })
      .catch(error => {
        console.error('加载模型失败:', error);
      });

  const de10= new ModelDissolveEffect(scene, renderer, camera,10);
  let pos10=new THREE.Vector3(26,0,-30)
  de10.loadModel('test15.obj', 5.0,pos10)
      .then((obj) => {
        dissolveEffect_list.push(de10);

        // console.log(obj.position)
        // animate();
      })
      .catch(error => {
        console.error('加载模型失败:', error);
      });

  const de11= new ModelDissolveEffect(scene, renderer, camera,11);
  let pos11=new THREE.Vector3(-25,0,7)
  de11.loadModel('test16.obj', 5.0,pos11)
      .then((obj) => {
        dissolveEffect_list.push(de11);

        // console.log(obj.position)
        // animate();
      })
      .catch(error => {
        console.error('加载模型失败:', error);
      });
  const de12= new ModelDissolveEffect(scene, renderer, camera,12);
  let pos12=new THREE.Vector3(30,0,7)
  de12.loadModel('test17.obj', 5.0,pos12)
      .then((obj) => {
        // animate();
        dissolveEffect_list.push(de12);
        // console.log(obj.position)
      })
      .catch(error => {
        console.error('加载模型失败:', error);
      });

  const de13= new ModelDissolveEffect(scene, renderer, camera,13);
  let pos13=new THREE.Vector3(21,0,-6)
  de13.loadModel('test18.obj', 5.0,pos13)
      .then((obj) => {
        // animate();
        dissolveEffect_list.push(de13);
        // console.log(obj.position)
      })
      .catch(error => {
        console.error('加载模型失败:', error);
      });

  const de14= new ModelDissolveEffect(scene, renderer, camera,14);
  let pos14=new THREE.Vector3(48,2,-10)
  de14.loadModel('test20.obj', 6.0,pos14)
      .then((obj) => {

        dissolveEffect_list.push(de14);
        // console.log(obj.position)
        animate();
      })
      .catch(error => {
        console.error('加载模型失败:', error);
      });
  }
  const params={
    x:0,
    y:0,
    z:0
  }
  gui = new GUI();
  const folderpoint = gui.addFolder('pos');
  folderpoint.add(params, 'x',-50,50,1).onChange(function (val) {
    de1.mesh.position.x = val;
  });
  folderpoint.add(params, 'y',-50,50,1).onChange(function (val) {
    de1.mesh.position.y = val;
  });
  folderpoint.add(params, 'z',-50,50,1).onChange(function (val) {
    de1.mesh.position.z = val;
  });


}


function loadOneWithMat(objFile, textFile, type, ypos, xpos = 0, zpos = 0,roty=0, scaleFactor = 1) {
  const textureLoader = new THREE.TextureLoader();
  const customTexture = textureLoader.load(textFile);
  // 加载OBJ 模型
  let flower;
  const mtlLoader = new MTLLoader()
  const mtlFile = objFile.replace('.obj', '.mtl');

  mtlLoader.load(mtlFile, (materials) => {
    materials.preload();
    // for (const material of Object.values(materials.materials)) {
    //   console.log(`Material ${material.name} maps:`, {
    //     map: material.map,
    //     bumpMap: material.bumpMap,
    //     specularMap: material.specularMap
    //     // 添加其他需要的贴图类型
    //   });
    // }
    const objLoader = new OBJLoader();
    objLoader.setMaterials(materials);
    objLoader.load(objFile, (object) => {
      object.traverse((child) => {
        // console.log(type)
        switch(type){
          case "bamboo":
            if (child instanceof THREE.Mesh) {
              // 计算边界框
              child.geometry.computeBoundingBox();

              // 添加透明效果
              child.material = new THREE.MeshPhysicalMaterial({
                color: 0x06511c, // 竹子绿色
                transparent: true,
                opacity: 0.7, // 调整透明度（0.0 完全透明，1.0 完全不透明）
                side: THREE.DoubleSide, // 允许双面渲染
                emissive: 0x9ff4a1, // 绿色自发光
                emissiveIntensity: 0.3, // 发光强度
                metalness: 0.2, // 轻微金属感
                roughness: 0.3, // 适当的粗糙度
                transmission: 0.8, // **玻璃材质的透光效果**
                clearcoat: 1.0, // 让表面更光滑
                clearcoatRoughness: 0.1,
              });
              // child.material.depthWrite = false; // 防止透明物体遮挡
            }
            break;
          case "lian":
            if (child.isMesh) {
              // 强制替换纹理
              if (child.material) {
                // 处理材质数组（如模型有多个材质）
                if (Array.isArray(child.material)) {
                  child.material.forEach(mat => {
                    mat.map = customTexture;
                    mat.needsUpdate = true;
                  });
                }
                // 处理单个材质
                else {
                  child.material.map = customTexture;
                  child.material.needsUpdate = true;
                }
              }
            }
            if (child instanceof THREE.Mesh) {
              // 设置发光材质
              child.material = new THREE.MeshStandardMaterial({
                map: child.material.map || null,
                color: child.material.map || null, // 发光颜色
                emissiveIntensity: 0.9, // 发光强度
                roughness: 0.1,
                metalness: 0.2,

              });
              child.material.transparent = true;
              child.material.opacity = 0.7;
              child.material.side = THREE.DoubleSide;

            }
            break;
          case "grass":
            if (child.isMesh) {
              // 强制替换纹理
              if (child.material) {
                // 处理材质数组（如模型有多个材质）
                if (Array.isArray(child.material)) {
                  child.material.forEach(mat => {
                    mat.map = customTexture;
                    mat.needsUpdate = true;
                  });
                }
                // 处理单个材质
                else {
                  child.material.map = customTexture;
                  child.material.needsUpdate = true;
                }
              }
            }
            if (child instanceof THREE.Mesh) {
              // 设置发光材质
              child.material = new THREE.MeshPhysicalMaterial({
                map: child.material.map || null,
                // color: 0x06511c, // 竹子绿色
                transparent: true,
                opacity: 1, // 调整透明度（0.0 完全透明，1.0 完全不透明）
                // side: THREE.DoubleSide, // 允许双面渲染
                emissive: 0x3AB9FA , // 绿色自发光
                emissiveIntensity: 0.5, // 发光强度
                metalness: 0.2, // 轻微金属感
                roughness: 0.3, // 适当的粗糙度
                transmission:1, // **玻璃材质的透光效果**
                clearcoat: 1.0, // 让表面更光滑
                clearcoatRoughness: 0.1,
              });


            }
            break;
          case "light":
            if (child.isMesh) {
              // 强制替换纹理
              if (child.material) {
                // 处理材质数组（如模型有多个材质）
                if (Array.isArray(child.material)) {
                  child.material.forEach(mat => {
                    mat.map = customTexture;
                    mat.needsUpdate = true;
                  });
                }
                // 处理单个材质
                else {
                  child.material.map = customTexture;
                  child.material.needsUpdate = true;
                }
              }
              child.material.depthWrite = false;
            }
            if (child instanceof THREE.Mesh) {
              // 设置发光材质
              child.material = new THREE.MeshStandardMaterial({
                map: child.material.map || null,
                emissive: 0xffaa33, // 发光颜色（橙色光）
                emissiveIntensity: 1.5, // 增强发光强度
                roughness: 0.1,
                metalness: 0.2,
                transparent: true,
                opacity: 0.5,
                side: THREE.DoubleSide,
              });

            }
            break;
          case "stone":
            if (child.isMesh) {
              // 强制替换纹理
              if (child.material) {
                // 处理材质数组（如模型有多个材质）

                if (Array.isArray(child.material)) {
                  child.material.forEach(mat => {
                    mat.map = customTexture;
                    mat.needsUpdate = true;
                  });
                }
                // 处理单个材质
                else {
                  child.material.map = customTexture;
                  child.material.needsUpdate = true;
                }
              }
            }
            if (child instanceof THREE.Mesh) {
              // 设置发光材质
              child.material = new THREE.MeshStandardMaterial({
                map: child.material.map || null,
                color: child.material.map || null, // 发光颜色
                emissiveIntensity: 0.3, // 发光强度
                roughness: 0.1,
                metalness: 0.2,

              });
              child.material.transparent = true;
              child.material.opacity = 0.7;
              child.material.side = THREE.DoubleSide;

            }
            break;
          case "miao":
            if (child instanceof THREE.Mesh) {
              // 计算边界框
              child.geometry.computeBoundingBox();

              // 添加透明效果
              child.material = new THREE.MeshPhysicalMaterial({
                color: 0x6d74df,
                transparent: true,
                opacity: 1, // 调整透明度（0.0 完全透明，1.0 完全不透明）
                side: THREE.DoubleSide, // 允许双面渲染
                emissive: 0x8cd7fe, // 绿色自发光
                emissiveIntensity: 1, // 发光强度
                metalness: 1, // 轻微金属感
                roughness: 0.3, // 适当的粗糙度
                transmission: 0.8, // **玻璃材质的透光效果**
                clearcoat: 1.0, // 让表面更光滑
                clearcoatRoughness: 0.1,
              });
              // child.material.depthWrite = false; // 防止透明物体遮挡
            }
            break;
          case "ground":
            if (child.isMesh) {
              // 强制替换纹理
              if (child.material) {
                // 处理材质数组（如模型有多个材质）
                if (Array.isArray(child.material)) {
                  child.material.forEach(mat => {
                    mat.map = customTexture;
                    mat.needsUpdate = true;
                  });
                }
                // 处理单个材质
                else {
                  child.material.map = customTexture;
                  child.material.needsUpdate = true;
                }
              }
              child.material.depthWrite = false;
            }
            if (child instanceof THREE.Mesh) {
              // 设置发光材质
              child.material = new THREE.MeshStandardMaterial({
                map: child.material.map || null,
                color:0x55a41,
                emissive: 0x11643A, // 发光颜色（橙色光）
                emissiveIntensity: 0.2, // 增强发光强度
                roughness: 0.9,
                metalness: 0.0,
                transparent: true,
                opacity: 0.96,
                side: THREE.DoubleSide,
              });
              child.material.depthWrite = true;  // 恢复深度写入（避免透明排序问题）
            }
            break;
          case "ting":
            if (child.isMesh) {
              // 强制替换纹理
              if (child.material) {
                // 处理材质数组（如模型有多个材质）

                if (Array.isArray(child.material)) {
                  child.material.forEach(mat => {
                    mat.map = customTexture;
                    mat.needsUpdate = true;
                  });
                }
                // 处理单个材质
                else {
                  child.material.map = customTexture;
                  child.material.needsUpdate = true;
                }
              }
            }
            if (child instanceof THREE.Mesh) {
              // 设置发光材质
              child.material = new THREE.MeshStandardMaterial({
                map: child.material.map || null,
                color: child.material.map || null, // 发光颜色
                emissiveIntensity: 0.3, // 发光强度
                roughness: 0.1,
                metalness: 0.2,

              });
              child.material.transparent = true;
              child.material.opacity = 0.7;
              child.material.side = THREE.DoubleSide;

            }
            break;
          case "zhouting":
            if (child.isMesh) {
              // 强制替换纹理
              if (child.material) {
                // 处理材质数组（如模型有多个材质）

                if (Array.isArray(child.material)) {
                  child.material.forEach(mat => {
                    mat.map = customTexture;
                    mat.needsUpdate = true;
                  });
                }
                // 处理单个材质
                else {
                  child.material.map = customTexture;
                  child.material.needsUpdate = true;
                }
              }
            }
            if (child instanceof THREE.Mesh) {
              // 设置发光材质
              child.material = new THREE.MeshStandardMaterial({
                map: child.material.map || null,
                color: child.material.map || null, // 发光颜色
                emissiveIntensity: 0.3, // 发光强度
                roughness: 0.1,
                metalness: 0.2,

              });
              child.material.transparent = true;
              child.material.opacity = 0.7;
              child.material.side = THREE.DoubleSide;

            }
            break;
          default:
            if (child.isMesh) {
              // 强制替换纹理
              if (child.material) {
                // 处理材质数组（如模型有多个材质）

                if (Array.isArray(child.material)) {
                  child.material.forEach(mat => {
                    mat.map = customTexture;
                    mat.needsUpdate = true;
                  });
                }
                // 处理单个材质
                else {
                  child.material.map = customTexture;
                  child.material.needsUpdate = true;
                }
              }
            }
            if (child instanceof THREE.Mesh) {
              // 设置发光材质
              child.material = new THREE.MeshStandardMaterial({
                map: child.material.map || null,
                color: child.material.map || null, // 发光颜色
                emissiveIntensity: 0.3, // 发光强度
                roughness: 0.1,
                metalness: 0.2,

              });
              child.material.transparent = true;
              child.material.opacity = 0.9;
              child.material.side = THREE.DoubleSide;

            }
        }
      });
      if (type === "light") {
        // 1. 计算模型的中心位置
        const boundingBox = new THREE.Box3().setFromObject(object);
        const center = new THREE.Vector3();
        boundingBox.getCenter(center);

        // 2. 创建点光源（限制在 3 米范围内）
        const pointLight = new THREE.PointLight(
          0xfffae6, // 光源颜色（暖橙色）
          15,        // 强度（根据需要调整）
          5,        // 光照距离 = 3 米（超出此范围完全衰减）
          0.1         // 衰减系数（数值越大，衰减越快）
        );
        pointLight.position.copy(center); // 光源位于模型中心
        pointLight.position.z-=1;
        // pointLight.position.y+=10;
        object.add(pointLight); // 将光源绑定到模型

      }
      if (type === "ting") {
        const boundingBox = new THREE.Box3().setFromObject(object);
        const center = new THREE.Vector3();
        boundingBox.getCenter(center);

        // 创建微暗的点光源（灯芯）
        const pointLight = new THREE.PointLight(
          0xffcc88,  // 暖黄色光源（与 emissive 颜色匹配）
          100,         // 低强度（5-10 适合微暗效果）
          30,         // 光照范围（3米）
          1.5        // 衰减系数（自然衰减）
        );
        pointLight.position.copy(center);
        object.add(pointLight); // 将光源绑定到模型
      }
      if (type === "lian") {
        const boundingBox = new THREE.Box3().setFromObject(object);
        const center = new THREE.Vector3();
        boundingBox.getCenter(center);

        // 创建微暗的点光源（灯芯）
        const pointLight = new THREE.PointLight(
          0xffcc88,  // 暖黄色光源（与 emissive 颜色匹配）
          20,         // 低强度（5-10 适合微暗效果）
          20,         // 光照范围（3米）
          1.5        // 衰减系数（自然衰减）
        );
        pointLight.position.copy(center);
        object.add(pointLight); // 将光源绑定到模型
      }
      if (type === "zhouting") {
        const boundingBox = new THREE.Box3().setFromObject(object);
        const center = new THREE.Vector3();
        boundingBox.getCenter(center);

        // 创建微暗的点光源（灯芯）
        const pointLight = new THREE.PointLight(
          0xffcc88,  // 暖黄色光源（与 emissive 颜色匹配）
          10,         // 低强度（5-10 适合微暗效果）
          10,         // 光照范围（3米）
          1.5        // 衰减系数（自然衰减）
        );
        pointLight.position.copy(center);
        object.add(pointLight); // 将光源绑定到模型
      }
      flower = object;
      // console.log(flower);
      const scaleFactor = 1; // 放大10倍
      flower.scale.set(scaleFactor, scaleFactor, scaleFactor);
      flower.position.y += ypos;
      flower.position.z += zpos;
      flower.position.x += xpos;

      flower.rotation.y+=roty;


      scene.add(flower);
      return flower;
    });
  })
}


function createLight(color) {

  const intensity = 20000;

  const light = new THREE.PointLight(color, intensity, 20);
  light.castShadow = true;
  light.shadow.bias = -0.005; // reduces self-shadowing on double-sided objects

  let geometry = new THREE.SphereGeometry(200, 1000, 1000);
  // let material = new THREE.MeshBasicMaterial( { color: 'yellow' } );
  // 3. 加载月亮贴图（不重复，完整包裹）
  const textureLoader = new THREE.TextureLoader();
  const moonTexture = textureLoader.load('moon.jpg');

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

  material.color.multiplyScalar(5);
  let sphere = new THREE.Mesh(geometry, material);


  light.add(sphere);

  return light;

}


function initCamera() {
  camera = new THREE.PerspectiveCamera(
    65, window.innerWidth / window.innerHeight, 1, 20000
  );
  // camera = new THREE.PerspectiveCamera(
  //     110, window.innerWidth / window.innerHeight, 0.11, 1000
  // );
  camera.position.set(0, 16, 52);
  // camera.position.set(0, 16, 40);
}

function enableControls() {
  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 10, 0);
  controls.update();
}


function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function render() {
  // renderer.toneMappingExposure=0.20; //删了亮度有bug
  water.material.uniforms['time'].value += 1.0 / 60.0;

  dissolveEffect_list.forEach(de=>{
    de.render()
  })
  dissolveEffect_list[1].ecrender()
  // renderer.render(scene, camera);

  pointLight.rotationY += 0.01;

}

function animate() {

  requestAnimationFrame(animate);


  render();

  stats.update()
}
// animate()

</script>

<template>

</template>

<style scoped>

</style>

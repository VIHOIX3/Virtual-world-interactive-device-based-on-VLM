// ThreeScene.js
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Water } from 'three/examples/jsm/objects/Water.js';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { EffectComposer, RenderPass, OutputPass, UnrealBloomPass, ShaderPass } from 'three/examples/jsm/Addons.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import snoise from './lib/noise/snoise.glsl?raw';




export class ThreeScene {
    constructor(container) {
        this.container = container;
        this.clock = new THREE.Clock();
        this.modelList = [];
        this.dissolveEffectList = [];

        this.grass_urls = import.meta.glob('./assets/草/*.obj', { as: 'url' });
        this.light_urls = import.meta.glob('./assets/灯/*.obj', { as: 'url' });
        this.flower_urls = import.meta.glob('./assets/花/*.obj', { as: 'url' });
        this.plant_urls = import.meta.glob('./assets/植物/*.obj', { as: 'url' });
        this.bamboo_urls = import.meta.glob('./assets/竹子/*.obj', { as: 'url' });
        this.stone_urls = import.meta.glob('./assets/石头/*.obj', { as: 'url' });
        this.dec_urls = import.meta.glob('./assets/装饰/*.obj', { as: 'url' });
        this.ground_urls = import.meta.glob('./assets/岛1/*.obj', { as: 'url' });
        this.zhou_urls = import.meta.glob('./assets/洲/*.obj', { as: 'url' });
        this.zhouting_urls = import.meta.glob('./assets/洲亭/*.obj', { as: 'url' });
        this.zhouzhi_urls = import.meta.glob('./assets/洲植/*.obj', { as: 'url' });
        this.lian_urls = import.meta.glob('./assets/莲花/*.obj', { as: 'url' });
        this.zihua_urls = import.meta.glob('./assets/zihua/*.obj', { as: 'url' });
        this.cao_urls = import.meta.glob('./assets/cao 3/*.obj', { as: 'url' });
        this.miao_urls = import.meta.glob('./assets/长苗/*.obj', { as: 'url' });
        this.ting_urls = import.meta.glob('./assets/亭子/*.obj', { as: 'url' });

        this.initRenderer();
        this.initScene();
        this.initCamera();
        this.initControls();
        this.initEventListeners();

        this.stats = this.initStats();
        this.initEnvironment();
        this.loadAssets();
    }

    initRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            powerPreference: "high-performance",
            antialias: false,
            precision: "lowp"
        });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 0.23;
        this.container.appendChild(this.renderer.domElement);
    }

    initScene() {
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.Fog(0x0a0a1a, 1, 800);

        // 初始化天空盒
        this.initSkybox();
    }

    initSkybox() {
        const geometry = new THREE.BoxGeometry(1600, 1600, 1600);
        const textureLoader = new THREE.TextureLoader();
        const textureUrls = ['nx.png', 'px.png', 'ny.png', 'py.png', 'nz.png', 'pz.png'];

        const materials = textureUrls.map(url => {
            return new THREE.MeshBasicMaterial({
                map: textureLoader.load(url),
                side: THREE.BackSide
            });
        });

        const skybox = new THREE.Mesh(geometry, materials);
        skybox.position.y = 20;
        this.scene.add(skybox);
    }

    initCamera() {
        this.camera = new THREE.PerspectiveCamera(
            65,
            this.container.clientWidth / this.container.clientHeight,
            1,
            20000
        );
        this.camera.position.set(0, 16, 52);
    }

    initControls() {
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.target.set(0, 10, 0);
        this.controls.update();
    }

    initStats() {
        const stats = new Stats();
        stats.dom.style.position = 'absolute';
        stats.dom.style.top = '0px';
        document.body.appendChild(stats.dom);
        return stats;
    }

    initEnvironment() {
        // 太阳和水面
        this.sun = new THREE.Vector3(-80, 5, -100);

        this.water = new Water(
            new THREE.PlaneGeometry(1000, 1500),
            {
                textureWidth: 512,
                textureHeight: 512,
                waterNormals: new THREE.TextureLoader().load('./src/assets/three.js-master-master/examples/textures/waternormals.jpg',
                    function (texture) {
                    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
                }),
                sunDirection: this.sun,
                sunColor: 0x000000,
                waterColor: 0x000000,
                distortionScale: 11.3,
                fog: true,
                alpha: 1,
                opacity: 1.0,
            }
        );
        this.water.rotation.x = -Math.PI / 2;
        this.scene.add(this.water);

        // 光源设置
        this.initLights();
    }

    initLights() {
        // 主光源
        this.spotLight = new THREE.SpotLight(0x8086db, 16500);
        this.spotLight.position.set(5, 50, 30);
        this.spotLight.angle = 1.6;
        this.spotLight.penumbra = 1;
        this.spotLight.decay = 1.8;
        this.spotLight.distance = 400;
        this.spotLight.castShadow = true;
        this.spotLight.shadow.mapSize.width = 1024;
        this.spotLight.shadow.mapSize.height = 1024;
        this.scene.add(this.spotLight);

        // 点光源
        this.pointLight = this.createLight(0xb9a7e2);
        this.pointLight.position.set(0, 48, -640);
        this.scene.add(this.pointLight);
    }

    createLight(color) {
        const intensity = 20000;
        const light = new THREE.PointLight(color, intensity, 20);
        light.castShadow = true;
        light.shadow.bias = -0.005;

        const geometry = new THREE.SphereGeometry(200, 100, 100);
        const textureLoader = new THREE.TextureLoader();
        const moonTexture = textureLoader.load('moon.jpg');

        const material = new THREE.MeshBasicMaterial({
            map: moonTexture,
            transparent: true,
            opacity: 0.7,
            side: THREE.DoubleSide,
            color: new THREE.Color(0xb9a7e2),
        });
        material.color.multiplyScalar(5);

        const sphere = new THREE.Mesh(geometry, material);
        light.add(sphere);
        return light;
    }

    initEventListeners() {
        window.addEventListener('resize', () => this.onWindowResize());
    }

    onWindowResize() {
        this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    }

    async loadAssets() {
        // 加载山脉

        await this.loadMountain();

        // // 加载其他模型
        await this.loadModels();

        // 开始动画循环
        this.animate();
    }

    async loadMountain() {
        return new Promise((resolve) => {
            const mtlLoader = new MTLLoader();
            mtlLoader.load('shan.mtl', (materials) => {
                materials.preload();
                const objLoader = new OBJLoader();
                objLoader.setMaterials(materials);
                objLoader.load('shan.obj', (object) => {
                    const scaleFactor = 5;
                    object.scale.set(scaleFactor, scaleFactor, scaleFactor);

                    const box = new THREE.Box3().setFromObject(object);
                    const size = new THREE.Vector3();
                    box.getSize(size);

                    object.position.y += size.y / 2;
                    object.position.z = 250;

                    object.traverse((child) => {
                        if (child instanceof THREE.Mesh) {
                            child.material = new THREE.MeshStandardMaterial({
                                map: child.material.map || null,
                                color: 0x1F2544,
                                emissive: 0x9670bd,
                                emissiveIntensity: 0.155,
                                metalness: 0.1,
                                roughness: 0.1,
                                transparent: true,
                                opacity: 0.9,
                                side: THREE.DoubleSide,
                            });
                        }
                    });
                    this.scene.add(object);
                    this.addMoonlight(object, size);
                    resolve();
                });
            });
        });
    }

    addMoonlight(mountain, mountainSize) {
        const moonLight = new THREE.DirectionalLight(0xFFE3F4, 5);
        moonLight.position.set(-102, -13, -400);

        moonLight.target.position.set(
            mountain.position.x,
            mountain.position.y + mountainSize.y * 0.7,
            -220
        );

        this.scene.add(moonLight.target);
        moonLight.castShadow = true;
        moonLight.shadow.camera.near = 10;
        moonLight.shadow.camera.far = 50;
        this.scene.add(moonLight);
    }

    async loadModels() {
        // 这里简化了模型加载，实际应用中应该按需加载
        const modelGroups = [
            { type: 'grass', path: this.grass_urls, texture: '333.jpg' },
            { type: 'light', path: this.light_urls, texture: 'src/assets/灯/deng.jpg' },
            { type: 'flower', path: this.flower_urls, texture: '333.jpg' },
            { type: 'plant', path: this.plant_urls, texture: '333.jpg' },
            { type: 'bamboo', path: this.bamboo_urls, texture: '333.jpg' },
            { type: 'stone', path: this.stone_urls, texture: 'src/assets/石头/1.png' },
            { type: 'ting', path: this.ting_urls, texture: '333.jpg' },
            { type: 'ground', path: this.ground_urls, texture: 'src/assets/岛1/grass.png' },
            { type: 'ground', path: this.zhou_urls, texture: 'src/assets/岛1/grass.png' },
            { type: 'zhouting', path: this.zhouting_urls, texture: 'src/assets/洲亭/1.jpg' },
            { type: 'grass', path: this.zhouzhi_urls, texture: '333.jpg' },
            { type: 'lian', path: this.lian_urls, texture: 'src/assets/莲花/lian1.jpg' },
            { type: 'lian', path: this.zihua_urls, texture: 'src/assets/zihua/zihua.jpg' },
            { type: 'grass', path: this.cao_urls, texture: 'src/assets/cao 3/cao3.jpg' },
            { type: 'miao', path: this.miao_urls, texture: 'src/assets/长苗/lef2.jpg' },
            { type: 'ting', path: this.ting_urls, texture: '333.jpg' },
            // 其他模型组...
        ];
        this.loadOnetype(modelGroups[0])//草
        this.loadOnetype(modelGroups[1])//灯
        this.loadOnetype(modelGroups[2])//花
        this.loadOnetype(modelGroups[3])//植
        this.loadOnetype(modelGroups[4])//bamboo
        this.loadOnetype(modelGroups[5])//stone
        this.loadOnetype(modelGroups[6])//dec
        this.loadOnetype(modelGroups[7],3,8)//ground
        this.loadOnetype(modelGroups[8],88,7.5,55)//zhou
        this.loadOnetype(modelGroups[9],88,7.5,55)//zhouting
        this.loadOnetype(modelGroups[10],88,7.5,55)//zhouzhi
        this.loadOnetype(modelGroups[11],7,8,12)//lian
        this.loadOnetype(modelGroups[12],3,10)//zihua
        this.loadOnetype(modelGroups[13])//cao
        this.loadOnetype(modelGroups[14])//miao
        this.loadOnetype(modelGroups[15])//ting



        //
        //
        //
        //
        //
        //
        // // 加载溶解效果模型
        // await this.loadDissolveModels();
    }

    async loadOnetype(group,x=3,y=7.5,z=0,roty = 0, scaleFactor = 1){
        //草
        const promises = Object.values( group.path).map(getUrl => getUrl());// 1. 获取所有文件的 Promise 数组
        const urls = await Promise.all(promises);// 2. 等待所有 Promise 完成

        for (const path in urls) {
            const model = await this.loadModelWithMaterial(
                urls[path],
                group.texture,
                group.type,
                y,
                x,
                z,
                roty,
                scaleFactor

            );
            this.modelList.push(model);
        }
    }


    async loadModelWithMaterial(objFile, textFile, type, ypos, xpos = 0, zpos = 0, roty = 0, scaleFactor = 1) {
        return new Promise((resolve) => {
            const textureLoader = new THREE.TextureLoader();
            const customTexture = textureLoader.load(textFile);

            const mtlLoader = new MTLLoader();
            const mtlFile = objFile.replace('.obj', '.mtl');
            mtlLoader.load(mtlFile, (materials) => {
                materials.preload();
                const objLoader = new OBJLoader();
                objLoader.setMaterials(materials);
                objLoader.load(objFile, (object) => {
                    object.traverse((child) => {
                        if (child instanceof THREE.Mesh) {
                            this.applyMaterial(child, type, customTexture);

                            if (type === 'light') {
                                this.addLightToModel(object);
                            }
                        }
                    });

                    object.scale.set(scaleFactor, scaleFactor, scaleFactor);
                    object.position.set(xpos, ypos, zpos);
                    object.rotation.y += roty;

                    this.scene.add(object);
                    resolve(object);
                });
            });
        });
    }

    applyMaterial(mesh, type, texture) {
        let material;

        switch(type) {
            case 'bamboo':
                material = new THREE.MeshPhysicalMaterial({
                    color: 0x06511c,
                    transparent: true,
                    opacity: 0.7,
                    side: THREE.DoubleSide,
                    emissive: 0x9ff4a1,
                    emissiveIntensity: 0.3,
                    metalness: 0.2,
                    roughness: 0.3,
                    transmission: 0.8,
                    clearcoat: 1.0,
                    clearcoatRoughness: 0.1,
                });
                break;

            case 'light':
                material = new THREE.MeshStandardMaterial({
                    map: texture,
                    emissive: 0xffaa33,
                    emissiveIntensity: 1.5,
                    roughness: 0.1,
                    metalness: 0.2,
                    transparent: true,
                    opacity: 0.5,
                    side: THREE.DoubleSide,
                });
                material.depthWrite = false;
                break;

            // 其他材质类型...

            default:
                material = new THREE.MeshStandardMaterial({
                    map: texture,
                    emissiveIntensity: 0.3,
                    roughness: 0.1,
                    metalness: 0.2,
                    transparent: true,
                    opacity: 0.9,
                    side: THREE.DoubleSide,
                });
        }

        mesh.material = material;
    }

    addLightToModel(model) {
        const boundingBox = new THREE.Box3().setFromObject(model);
        const center = new THREE.Vector3();
        boundingBox.getCenter(center);

        const pointLight = new THREE.PointLight(0xfffae6, 15, 5, 0.1);
        pointLight.position.copy(center);
        pointLight.position.z -= 1;
        model.add(pointLight);
    }

    async loadDissolveModels() {
        const models = [
            { path: 'test13.obj', position: new THREE.Vector3(10, 0, 16), scale: 5.0 },
            { path: 'test12.obj', position: new THREE.Vector3(35, 0, 13), scale: 5.0 },
            { path: 'test11.obj', position: new THREE.Vector3(-20, 0, 30), scale: 5.0 },
            { path: 'test20.obj', position: new THREE.Vector3(28, 0, -10), scale: 5.0 }
        ];

        for (const model of models) {
            const effect = new ModelDissolveEffect(this.scene, this.renderer, this.camera);
            try {
                await effect.loadModel(model.path, model.scale, model.position);
                this.dissolveEffectList.push(effect);
            } catch (error) {
                console.error(`加载模型 ${model.path} 失败:`, error);
            }
        }
    }

    render() {
        this.water.material.uniforms['time'].value += 1.0 / 60.0;

        for (const effect of this.dissolveEffectList) {
            effect.render();
        }

        if (this.dissolveEffectList[1]) {
            this.dissolveEffectList[1].ecrender();
        }

        this.pointLight.rotation.y += 0.00001;
        this.renderer.render(this.scene, this.camera);
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        // const delta = this.clock.getDelta();

        this.render();
        this.stats.update();
    }

    cleanup() {
        window.removeEventListener('resize', this.onWindowResize);
        this.renderer.dispose();
        // 其他清理逻辑...
    }
}

class ModelDissolveEffect {
    constructor(scene, renderer, camera) {
        // console.log(camera)
        this.scene = scene;
        // this.bloomscene=bloomscene;
        this.renderer = renderer;
        this.camera = camera;
        this.mesh = null;
        this.particleMesh = null;
        this.effectComposer = null;
        this.bloomLayer = new THREE.Layers();
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
            dissolveMaterial.emissiveIntensity = 10;
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

            this.particleMaxOffsetArr[i] = Math.random() * 5 + 3;

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
            uniforms.uProgress.value += 0.1;
            if (uniforms.uProgress.value > 14) {
                scene.remove(this.particleMesh);
                this.mesh.userData.dissolving = false;
            }
        } else {
            uniforms.uProgress.value -= 0.1;
            if (uniforms.uProgress.value < -17) {
                // scene.add(this.particleMesh);
                this.mesh.userData.dissolving = true;
            }
        }
    }

    // 渲染场景
    render() {

        if (this.mesh) {
            this.updateParticles();
            this.updateDissolve();
        }
    }
    ecrender(){
        this.effectComposer.render();
    }
}
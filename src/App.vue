<script setup>
import * as Three from 'three'
import gsap from 'gsap'
import {GUI} from "three/examples/jsm/libs/lil-gui.module.min.js"; //li-GUI
// import * as Three from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';

//create scene
const scene = new Three.Scene()
// scene.background=new Three.Color('white')

//create camera
const camera=new Three.PerspectiveCamera(
  450,
  window.innerWidth/window.innerHeight,
  0.1,
  1000
);


//create render
const renderer=new Three.WebGLRenderer();
renderer.setSize(window.innerWidth,window.innerHeight);
document.body.appendChild(renderer.domElement);


// 3️⃣ 轨道控制
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

//create box
const geometry = new Three.BoxGeometry(1,1,1);

//create mesh
const material = new Three.MeshBasicMaterial({  color: 0x00ff00,});
//set material as line mode
// material.wireframe=true;

const cube=new Three.Mesh(geometry,material)

//add box to scene
// scene.add(cube);

//set camera position
camera.position.z=5;
camera.lookAt(0, 0, 0);




// GUI, add func
let evenObj={
  Fullscreen:function () {
    document.body.requestFullscreen();
    console.log('FULL SCREEN');
  },
  ExitFullscreen:function() {
    document.exitFullscreen()
    console.log('EXIT Fullscreen');
  },
};

// 半球光
{

  const skyColor = 0xb1e1ff // 蓝色
  const groundColor = 0xffffff // 白色
  const intensity = 1
  const light = new Three.HemisphereLight(skyColor, groundColor, intensity)
  scene.add(light)
}

// 方向光
{

  const color = 0xffffff
  const intensity = 1
  const light = new Three.DirectionalLight(color, intensity)
  light.position.set(0, 10, 0)
  light.target.position.set(-5, 0, 0)
  scene.add(light)
  scene.add(light.target)
}
//particle system
let particleSystem;



//dog obj
let dog;
const pos_params={positionX:0,
positionY:0,
positionZ:0};
//crete obj
const objLoader=new OBJLoader();
objLoader.load("test1.obj",(root)=>{
  root.rotation.x=0.5;
  // root.rotation.y=1;
  scene.add(root);
  dog=root;
  dog.position.set(0,0,-1);

  //get geometry
  const geometry=root.children[0].geometry;
  //create particle material
  const particleMaterial=new Three.PointsMaterial({
    size:0.05,
    // color:0x00ff00,
    transparent:true,
    opacity:0.1,
    // blending:Three.AdditiveBlending,
    depthWrite:true,
  });
  //create particle system
  particleSystem=new Three.Points(geometry,particleMaterial);
  scene.add(particleSystem);

  // 4. 存储原始顶点位置
  const originalPositions = geometry.attributes.position.array;
  particleSystem.userData.originalPositions = new Float32Array(originalPositions);
});

const loader=new OBJLoader()
const mtlLoader = new MTLLoader()
mtlLoader.load('FL22_1.mtl', function (materials) {
  materials.preload()
  loader.setMaterials(materials)
  loader.load('minfl3.obj', function (mesh) {
    scene.add(mesh)
  })
})


const gui=new GUI();

// gui.add(material,"wireframe").name('isWireframe');

// let colorParams={
//   cubeColor:'#ff0000',
// };
// gui.addColor(colorParams,"cubeColor").name('colorParams').onChange((val)=>{
//   cube.material.color.set(val);
// });

// add func obj
gui.add(evenObj,"Fullscreen");
gui.add(evenObj,"ExitFullscreen");
//set control group
// let folder=gui.addFolder("set cube pos");
// //control cube pos
// folder.add(cube.position,"x",-5,5).name("cube: x pos").onChange((val)=>{
//   {console.log(val);}
// });
// folder.add(cube.position,"y").min(-10).max(10).step(1).name("cube: y pos");
// folder.add(cube.position,"z").min(-10).max(10).step(1).name("cube: z pos");

//set dog position
{

const dogFolder=gui.addFolder('dog position');
dogFolder.add(pos_params,'positionX',-10,10).onChange((val)=>{
  dog.position.x=val;
});
dogFolder.add(pos_params,'positionY',-10,10).onChange((val)=>{
  dog.position.y=val;
})
dogFolder.add(pos_params,'positionZ',-10,10).onChange((val)=>{
  dog.position.z=val;
})
}





// //mesh loader
// let textureLoader=new Three.TextureLoader();
// let texture=textureLoader.load("../public/黑影人.jpg")
// //ao
// let aoMap=textureLoader.load("../public/黑影人.jpg")
//
// let planeGeo=new Three.PlaneGeometry(2,2,1);
// let planeMat=new Three.MeshBasicMaterial({
//   color:0xffffff,
//   map:texture,
//   transparent:true,
//   aoMap:aoMap,
// });
// let plane=new Three.Mesh(planeGeo, planeMat);
// scene.add(plane);
//render func
// function animate() {
//   requestAnimationFrame(animate);
//   // cube.rotation.x+=0.01
//   // cube.rotation.y+=0.01
//   // dog.rotation.x+=0.01;
//   dog.rotation.y+=0.01;
//   renderer.render(scene, camera);
// }

const clock=new Three.Clock();
function animate() {
  // const delta = clock.getDelta();
  const time = clock.getElapsedTime();

  if (particleSystem) {
    const positions = particleSystem.geometry.attributes.position.array;
    const originals = particleSystem.userData.originalPositions;

    // 为每个顶点添加动态偏移
    for (let i = 0; i < positions.length; i += 3) {
      const ix = i / 3;
      positions[i] = originals[i] + Math.sin(time * 2 + ix) * 0.1;
      positions[i + 1] = originals[i + 1] + Math.cos(time * 1.5 + ix) * 0.1;
      positions[i + 2] = originals[i + 2] + Math.sin(time * 1.2 + ix) * 0.1;
    }

    particleSystem.geometry.attributes.position.needsUpdate = true;
  }

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
//begin animate,
animate();
//render


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

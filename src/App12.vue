<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { ThreeScene } from './example2.js';


const threeContainer = ref(null);
let threeManager = null;

// objFiles.js


// 初始化Three.js场景
onMounted(async () => {

  threeManager = new ThreeScene(threeContainer.value);
  await threeManager.loadAssets();

    // 示例：从Vue控制Three.js

});

// // 清理资源
// onBeforeUnmount(() => {
//   if (threeManager) {
//     threeManager.dispose();
//     threeManager = null;
//   }
// });

// 暴露方法给父组件
// defineExpose({
//   getThreeManager: () => threeManager
// });
</script>

<template>
  <div ref="threeContainer" class="three-container"></div>
</template>

<style scoped>
.three-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}
</style>
<script setup>
import { ref, onMounted, onUnmounted } from "vue";

const gridSize = ref({ rows: 30, cols: 50 });
const grid = ref([]);
const isRunning = ref(false);
const generationCount = ref(0);
let timerId = null;

const initializeGrid = () => {
  if (isRunning.value) {
    stopGame();
  }
  const newGrid = [];
  for (let r = 0; r < gridSize.value.rows; r++) {
    const row = [];
    for (let c = 0; c < gridSize.value.cols; c++) {
      // Randomly initialize cells: ~25% chance of being alive
      row.push({ alive: Math.random() < 0.25, id: `cell-${r}-${c}` });
    }
    newGrid.push(row);
  }
  grid.value = newGrid;
  generationCount.value = 0;
};

const countLiveNeighbors = (r, c) => {
  let count = 0;
  for (let i = -1; i <= 1; i++) {
    for (let j = -1; j <= 1; j++) {
      if (i === 0 && j === 0) continue;
      const newR = r + i;
      const newC = c + j;
      if (
        newR >= 0 &&
        newR < gridSize.value.rows &&
        newC >= 0 &&
        newC < gridSize.value.cols &&
        grid.value[newR][newC].alive
      ) {
        count++;
      }
    }
  }
  return count;
};

const calculateNextGeneration = () => {
  const nextGrid = grid.value.map((row, r) =>
    row.map((cell, c) => {
      const liveNeighbors = countLiveNeighbors(r, c);
      let alive = cell.alive;
      if (cell.alive) {
        if (liveNeighbors < 2 || liveNeighbors > 3) {
          alive = false; // Dies by underpopulation or overpopulation
        }
        // else lives on to the next generation (2 or 3 neighbors)
      } else {
        if (liveNeighbors === 3) {
          alive = true; // Becomes alive by reproduction
        }
      }
      return { ...cell, alive };
    })
  );
  grid.value = nextGrid;
  generationCount.value++;
};

const startGame = () => {
  if (isRunning.value) return;
  isRunning.value = true;
  timerId = setInterval(() => {
    calculateNextGeneration();
  }, 500);
};

const stopGame = () => {
  isRunning.value = false;
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
};

const resetGame = () => {
  stopGame();
  initializeGrid();
};

const getCellDynamicClasses = (cell, r, c) => {
  const liveNeighbors = countLiveNeighbors(r, c);
  const dynamicClasses = {};

  if (cell.alive) {
    if (liveNeighbors < 2) {
      // Dying - Underpopulation
      dynamicClasses["bg-purple-500/50"] = true;
      dynamicClasses["shadow-[0_0_8px_theme(colors.purple.500)]"] = true;
    } else if (liveNeighbors > 3) {
      // Dying - Overpopulation
      dynamicClasses["bg-teal-500/50"] = true;
      dynamicClasses["shadow-[0_0_8px_theme(colors.teal.500)]"] = true;
    } else {
      // Stable Alive (2 or 3 neighbors)
      dynamicClasses["bg-pink-400"] = true;
      dynamicClasses[
        "shadow-[0_0_8px_theme(colors.pink.400),_0_0_3px_theme(colors.pink.300)]"
      ] = true;
    }
  } else {
    // Dead cell
    if (liveNeighbors === 3) {
      // Will be born (currently dead but conditions met for reproduction)
      dynamicClasses["bg-cyan-400"] = true;
      dynamicClasses[
        "shadow-[0_0_8px_theme(colors.cyan.400),_0_0_3px_theme(colors.cyan.300)]"
      ] = true;
    } else {
      // Stable Dead
      dynamicClasses["bg-gray-800/50"] = true;
      dynamicClasses["hover:bg-gray-700/50"] = true;
    }
  }
  return dynamicClasses;
};

onMounted(() => {
  initializeGrid();
});

onUnmounted(() => {
  stopGame(); // Clean up the interval when the component is unmounted
});
</script>

<template>
  <div
    class="p-4 bg-gray-950 min-h-screen flex flex-col justify-center items-center font-['Consolas',_monospace]"
  >
    <h1 class="text-xs font-bold text-pink-400 tracking-wide p-3">
      Conway's Game of Life
    </h1>
    <div
      class="grid border-2 border-pink-500/70 shadow-[0_0_25px_theme(colors.pink.600),_0_0_10px_theme(colors.pink.400),_inset_0_0_15px_theme(colors.pink.700/50)] bg-gray-950"
      :style="{
        'grid-template-columns': `repeat(${gridSize.cols}, minmax(0, 1fr))`,
        width: `${gridSize.cols * 24 + 4}px`,
      }"
    >
      <template v-for="(row, rowIndex) in grid" :key="`row-${rowIndex}`">
        <div
          v-for="(cell, colIndex) in row"
          :key="cell.id"
          class="w-6 h-6 border border-pink-700/25 transition-colors duration-500 ease-in-out shadow-[0_0_2px_theme(colors.pink.700/50)]"
          :class="getCellDynamicClasses(cell, rowIndex, colIndex)"
        ></div>
      </template>
    </div>
    <div class="mt-12 text-center">
      <p class="mb-6 text-xl text-purple-300 tracking-wide">
        Generation:
        <span class="font-bold text-purple-200">{{ generationCount }}</span>
      </p>
      <button
        @click="startGame"
        :disabled="isRunning"
        class="cursor-pointer px-6 py-2 bg-cyan-600/70 text-cyan-100 rounded border border-cyan-500 hover:bg-cyan-500 hover:text-white hover:shadow-[0_0_15px_theme(colors.cyan.400)] focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-opacity-50 disabled:bg-gray-700 disabled:text-gray-500 disabled:border-gray-600 disabled:shadow-none transition-all duration-200 ease-in-out mr-3 shadow-[0_0_8px_theme(colors.cyan.600)]"
      >
        Engage
      </button>
      <button
        @click="stopGame"
        :disabled="!isRunning"
        class="cursor-pointer px-6 py-2 bg-pink-600/70 text-pink-100 rounded border border-pink-500 hover:bg-pink-500 hover:text-white hover:shadow-[0_0_15px_theme(colors.pink.400)] focus:outline-none focus:ring-2 focus:ring-pink-400 focus:ring-opacity-50 disabled:bg-gray-700 disabled:text-gray-500 disabled:border-gray-600 disabled:shadow-none transition-all duration-200 ease-in-out mr-3 shadow-[0_0_8px_theme(colors.pink.600)]"
      >
        Disengage
      </button>
      <button
        @click="resetGame"
        class="cursor-pointer px-6 py-2 bg-purple-600/70 text-purple-100 rounded border border-purple-500 hover:bg-purple-500 hover:text-white hover:shadow-[0_0_15px_theme(colors.purple.400)] focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-opacity-50 transition-all duration-200 ease-in-out shadow-[0_0_8px_theme(colors.purple.600)]"
      >
        Reinitialize
      </button>
    </div>
  </div>
</template>

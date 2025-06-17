<script setup>
import { ref, onMounted, onUnmounted, watch } from "vue";

const gridSize = ref({ rows: 30, cols: 50 });
const grid = ref([]);
const isRunning = ref(false);
const generationCount = ref(0);
let timerId = null;
const MAX_CONCURRENT_SOUNDS = 15; // Limit simultaneous sounds

// Web Audio API specific refs
const audioContext = ref(null);
const masterGainNode = ref(null);
const soundEnabled = ref(false);
const activeOscillators = ref(new Map()); // Map<cellId, { oscillator: OscillatorNode, gainNode: GainNode }>
const soundStatusMessage = ref("Sound not initialized.");

// Initialize the grid with random alive/dead cells
const initializeGrid = () => {
  if (isRunning.value) {
    stopGame();
  }
  // Clear any lingering sounds from a previous grid
  // Make a copy of keys to iterate over, as stopNote modifies the map
  const keysToStop = Array.from(activeOscillators.value.keys());
  keysToStop.forEach((cellId) => stopNote(cellId));
  // Ensure the map is clear after stopping all notes
  activeOscillators.value.clear();

  const newGrid = [];
  for (let r = 0; r < gridSize.value.rows; r++) {
    const row = [];
    for (let c = 0; c < gridSize.value.cols; c++) {
      row.push({ alive: Math.random() < 0.25, id: `cell-${r}-${c}` });
    }
    newGrid.push(row);
  }
  grid.value = newGrid;
  generationCount.value = 0;
};

// Count live neighbors for a given cell
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

// --- Web Audio API Functions ---
const initAudio = () => {
  if (audioContext.value) return; // Already initialized
  try {
    audioContext.value = new (window.AudioContext ||
      window.webkitAudioContext)();
    masterGainNode.value = audioContext.value.createGain();
    masterGainNode.value.connect(audioContext.value.destination);
    masterGainNode.value.gain.setValueAtTime(
      soundEnabled.value ? 0.3 : 0,
      audioContext.value.currentTime
    ); // Initial volume (0.3 if enabled)
    soundStatusMessage.value = "Sound ready. Toggle to enable.";
  } catch (e) {
    console.error("Web Audio API is not supported in this browser.", e);
    soundStatusMessage.value = "Web Audio API not supported.";
    soundEnabled.value = false;
  }
};

// Play a note for a cell
const playNote = (cellId, rowIndex) => {
  if (
    !audioContext.value ||
    !soundEnabled.value ||
    activeOscillators.value.has(cellId)
  )
    return;

  if (activeOscillators.value.size >= MAX_CONCURRENT_SOUNDS) {
    // Optionally, stop the oldest sound or just don't play new one
    // For now, just don't play if limit is reached
    return;
  }

  const oscillator = audioContext.value.createOscillator();
  const gainNode = audioContext.value.createGain();

  // Map row to frequency (Pentatonic scale for more musicality)
  const scale = [0, 2, 4, 7, 9]; // Pentatonic scale intervals (0=root, 2=major 2nd, 4=major 3rd, 7=perfect 5th, 9=major 6th)
  const octave = Math.floor((rowIndex % 24) / scale.length); // Spread notes over a couple of octaves
  const noteInScale = scale[rowIndex % scale.length];
  const midiNote = 48 + octave * 12 + noteInScale; // Start from C3
  const frequency = 440 * Math.pow(2, (midiNote - 69) / 12);

  oscillator.type = "sine"; // sine, square, sawtooth, triangle
  oscillator.frequency.setValueAtTime(
    frequency,
    audioContext.value.currentTime
  );

  gainNode.connect(masterGainNode.value);
  gainNode.gain.setValueAtTime(0, audioContext.value.currentTime);
  gainNode.gain.linearRampToValueAtTime(
    0.25,
    audioContext.value.currentTime + 0.05
  ); // Quick attack, reduced gain

  oscillator.connect(gainNode);
  oscillator.start();

  activeOscillators.value.set(cellId, { oscillator, gainNode });
};

// Stop a note for a cell
const stopNote = (cellId) => {
  if (!audioContext.value || !activeOscillators.value.has(cellId)) return;

  const { oscillator, gainNode } = activeOscillators.value.get(cellId);
  const now = audioContext.value.currentTime;

  gainNode.gain.setValueAtTime(gainNode.gain.value, now); // Hold current gain
  gainNode.gain.linearRampToValueAtTime(0, now + 0.15); // Gentle release, shortened

  oscillator.stop(now + 0.16); // Stop after fade out
  // No need to disconnect manually, garbage collection will handle once no references

  activeOscillators.value.delete(cellId);
};
// --- End Web Audio API Functions ---

// Calculate the next generation of the grid
const calculateNextGeneration = () => {
  const newGridData = grid.value.map((row, r) =>
    row.map((cell, c) => {
      const liveNeighbors = countLiveNeighbors(r, c);
      const oldAlive = cell.alive;
      let newAlive = oldAlive;

      if (oldAlive) {
        if (liveNeighbors < 2 || liveNeighbors > 3) {
          newAlive = false; // Dies
        }
      } else {
        if (liveNeighbors === 3) {
          newAlive = true; // Born
        }
      }

      if (soundEnabled.value && audioContext.value) {
        if (newAlive && !oldAlive) {
          // Born
          playNote(cell.id, r);
        } else if (!newAlive && oldAlive) {
          // Died
          stopNote(cell.id);
        }
      }
      return { ...cell, alive: newAlive };
    })
  );
  grid.value = newGridData;
  generationCount.value++;
};

// Start the game
const startGame = () => {
  if (isRunning.value) return;
  if (audioContext.value && audioContext.value.state === "suspended") {
    audioContext.value.resume();
  }
  isRunning.value = true;
  timerId = setInterval(() => {
    calculateNextGeneration();
  }, 500);
};

// Stop the game
const stopGame = (clearAllSounds = true) => {
  isRunning.value = false;
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
  if (clearAllSounds && soundEnabled.value) {
    activeOscillators.value.forEach((_sound, cellId) => {
      stopNote(cellId);
    });
    // activeOscillators.value.clear() // stopNote already deletes
  }
};

// Reset the game
const resetGame = () => {
  const wasRunning = isRunning.value;
  stopGame(true);
  initializeGrid();
  if (wasRunning) {
    startGame();
  }
};

// Get dynamic classes for cell styling
const getCellDynamicClasses = (cell, r, c) => {
  const liveNeighbors = countLiveNeighbors(r, c);
  const dynamicClasses = {};

  if (cell.alive) {
    if (liveNeighbors < 2) {
      dynamicClasses["bg-purple-500/50"] = true;
      dynamicClasses["shadow-[0_0_8px_theme(colors.purple.500)]"] = true;
    } else if (liveNeighbors > 3) {
      dynamicClasses["bg-teal-500/50"] = true;
      dynamicClasses["shadow-[0_0_8px_theme(colors.teal.500)]"] = true;
    } else {
      dynamicClasses["bg-pink-400"] = true;
      dynamicClasses[
        "shadow-[0_0_8px_theme(colors.pink.400),_0_0_3px_theme(colors.pink.300)]"
      ] = true;
    }
  } else {
    if (liveNeighbors === 3) {
      dynamicClasses["bg-cyan-400"] = true;
      dynamicClasses[
        "shadow-[0_0_8px_theme(colors.cyan.400),_0_0_3px_theme(colors.cyan.300)]"
      ] = true;
    } else {
      dynamicClasses["bg-gray-800/50"] = true;
      dynamicClasses["hover:bg-gray-700/50"] = true;
    }
  }
  return dynamicClasses;
};

// Watch for changes in soundEnabled and adjust audio context and master volume
watch(soundEnabled, (newValue) => {
  if (audioContext.value && masterGainNode.value) {
    if (newValue) {
      if (audioContext.value.state === "suspended") {
        audioContext.value.resume(); // Resume context if suspended, user interaction might be needed
      }
      masterGainNode.value.gain.linearRampToValueAtTime(
        0.3,
        audioContext.value.currentTime + 0.1
      ); // Fade in master volume
      soundStatusMessage.value = "Sound enabled."; // This message is no longer displayed, but logic kept for now
    } else {
      masterGainNode.value.gain.linearRampToValueAtTime(
        0,
        audioContext.value.currentTime + 0.1
      ); // Fade out master volume
      // Stop all currently playing notes when sound is disabled globally
      activeOscillators.value.forEach((_sound, cellId) => {
        stopNote(cellId); // This will handle the fade out for individual notes
      });
      soundStatusMessage.value = "Sound disabled."; // This message is no longer displayed, but logic kept for now
    }
  }
});

// Lifecycle hooks
onMounted(() => {
  initializeGrid();
  initAudio(); // Initialize Web Audio on component mount
});

onUnmounted(() => {
  stopGame(true); // Clean up the interval and sounds
  if (audioContext.value) {
    audioContext.value
      .close()
      .catch((e) => console.error("Error closing AudioContext:", e));
  }
});
</script>

<template>
  <div
    class="p-4 bg-gray-950 min-h-screen flex flex-col justify-center items-center font-['Consolas',_monospace]"
  >
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
        @click="stopGame()"
        :disabled="!isRunning"
        class="cursor-pointer px-6 py-2 bg-pink-600/70 text-pink-100 rounded border border-pink-500 hover:bg-pink-500 hover:text-white hover:shadow-[0_0_15px_theme(colors.pink.400)] focus:outline-none focus:ring-2 focus:ring-pink-400 focus:ring-opacity-50 disabled:bg-gray-700 disabled:text-gray-500 disabled:border-gray-600 disabled:shadow-none transition-all duration-200 ease-in-out mr-3 shadow-[0_0_8px_theme(colors.pink.600)]"
      >
        Disengage
      </button>
      <button
        @click="resetGame"
        class="cursor-pointer px-6 py-2 bg-purple-600/70 text-purple-100 rounded border border-purple-500 hover:bg-purple-500 hover:text-white hover:shadow-[0_0_15px_theme(colors.purple.400)] focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-opacity-50 transition-all duration-200 ease-in-out mr-3 shadow-[0_0_8px_theme(colors.purple.600)]"
      >
        Reinitialize
      </button>
      <button
        @click="soundEnabled = !soundEnabled"
        :disabled="!audioContext"
        :class="{
          'bg-green-600/70 hover:bg-green-500 border-green-500 shadow-[0_0_8px_theme(colors.green.600)] text-green-100 hover:text-white':
            soundEnabled,
          'bg-red-600/70 hover:bg-red-500 border-red-500 shadow-[0_0_8px_theme(colors.red.600)] text-red-100 hover:text-white':
            !soundEnabled && audioContext,
          'bg-gray-600/70 border-gray-500 text-gray-400': !audioContext,
        }"
        class="cursor-pointer px-4 py-2 rounded border transition-all duration-200 ease-in-out shadow-[0_0_8px_theme(colors.gray.600)]"
        title="Toggle Sound"
      >
        <span v-if="soundEnabled">🔊 Sound</span>
        <span v-else-if="audioContext">🔇 Sound</span>
        <span v-else>🚫</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import PhotoTile from './PhotoTile.vue'
import StatusPill from './StatusPill.vue'
import { useData, fmt } from '../composables/useData.js'

// Kartu ringkas: foto, nama, jumlah. Label status hanya muncul kalau ada yang perlu diperhatikan.
const props = defineProps({ cluster: { type: Object, required: true } })
const { families } = useData()
const color = computed(() => families.value[props.cluster.family]?.color || '#8d938e')
const samples = computed(() => props.cluster.samples || [])
const mode = computed(() => (samples.value.length >= 3 ? 'mosaic' : samples.value.length ? 'single' : 'empty'))
</script>

<template>
  <RouterLink :to="`/klaster/${cluster.id}`" class="ccard">
    <div class="cover" :class="mode" :style="{ '--fam': color }">
      <template v-if="mode === 'mosaic'">
        <PhotoTile v-for="i in 3" :key="i" :src="samples[i - 1].src" :color="color" :class="`c${i - 1}`" />
      </template>
      <PhotoTile v-else-if="mode === 'single'" :src="samples[0].src" :color="color" />
      <div v-else class="type-cover"><span class="mono">{{ cluster.id }}</span></div>
      <StatusPill v-if="cluster.status !== 'lolos'" class="pill" :status="cluster.status" size="sm" />
    </div>
    <div class="body">
      <h3 class="name"><span v-if="cluster.id !== 'noise'" class="code mono">{{ cluster.id }}</span>{{ cluster.name }}</h3>
      <span class="count num">{{ fmt.int(cluster.size) }} foto</span>
    </div>
  </RouterLink>
</template>

<style scoped>
.ccard {
  display: flex; flex-direction: column; min-width: 0;
  border: 1px solid var(--line); border-radius: var(--r-lg); background: var(--bg);
  overflow: hidden; transition: border-color .15s, box-shadow .15s;
}
.ccard:hover { border-color: var(--line-strong); box-shadow: var(--shadow); }
.cover {
  position: relative; display: grid; gap: 2px; aspect-ratio: 4 / 3; background: var(--line);
  grid-template-columns: 1fr;
}
.cover.mosaic { grid-template-columns: 2fr 1fr; grid-template-rows: 1fr 1fr; }
.cover :deep(.tile) { aspect-ratio: auto; height: 100%; }
.mosaic .c0 { grid-row: 1 / 3; }
.type-cover {
  display: flex; align-items: flex-end; padding: 14px;
  background: color-mix(in srgb, var(--fam) 8%, var(--bg-sunken));
}
.type-cover .mono { font-size: 34px; font-weight: 600; letter-spacing: -0.04em; color: color-mix(in srgb, var(--fam) 55%, var(--fg-3)); }
.pill { position: absolute; top: 8px; left: 8px; box-shadow: 0 0 0 2px var(--bg); }
.body { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; padding: 12px 14px 14px; }
.name { font-size: 16px; font-weight: 650; line-height: 1.25; letter-spacing: -0.02em; min-width: 0; }
.code { font-size: 11.5px; font-weight: 600; color: var(--fg-3); margin-right: 7px; letter-spacing: .02em; }
.count { font-size: 13px; color: var(--fg-3); white-space: nowrap; }
</style>

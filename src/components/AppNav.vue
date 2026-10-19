<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import Icon from './Icon.vue'
import LogoMark from './LogoMark.vue'
import { backend } from '../services/api.js'

const route = useRoute()

const items = computed(() => [
  { to: '/', label: 'Beranda', short: 'Beranda', icon: 'home', match: (p) => p === '/' },
  { to: '/live', label: 'Live kamera', short: 'Live', icon: 'live', match: (p) => p.startsWith('/live') },
  { to: '/foto', label: 'Foto barang', short: 'Foto', icon: 'foto', match: (p) => p.startsWith('/foto') },
  { to: '/klaster', label: 'Klaster', short: 'Klaster', icon: 'klaster', match: (p) => p.startsWith('/klaster') },
])
</script>

<template>
  <aside class="side" aria-label="Navigasi utama">
    <RouterLink to="/" class="brand">
      <LogoMark :size="26" />
      <span class="brand-name">SiPilah</span>
    </RouterLink>
    <nav class="links">
      <RouterLink
        v-for="it in items" :key="it.to" :to="it.to" class="link"
        :class="{ active: it.match(route.path) }" :aria-current="it.match(route.path) ? 'page' : undefined"
      >
        <span class="marker" aria-hidden="true" />
        <Icon :name="it.icon" :size="22" />
        <span class="label">{{ it.label }}</span>
        <span v-if="it.badge" class="badge mono">{{ it.badge }}</span>
      </RouterLink>
    </nav>
    <p class="conn" :class="backend.status" :title="backend.reason || ''">
      <i aria-hidden="true" />
      {{ backend.status === 'asli' ? 'Model tersambung' : backend.status === 'cek' ? 'Menyambung…' : 'Mode simulasi' }}
    </p>
    <div class="station">
      <span class="avatar">RN</span>
      <span class="who">
        <span class="name">Rina</span>
        <span class="role mono">OPERATOR · MEJA 2</span>
      </span>
    </div>
  </aside>

  <nav class="tabbar" aria-label="Navigasi utama">
    <RouterLink
      v-for="it in items" :key="it.to" :to="it.to" class="tab"
      :class="{ active: it.match(route.path) }" :aria-current="it.match(route.path) ? 'page' : undefined"
    >
      <span class="tab-ic">
        <Icon :name="it.icon" :size="22" />
        <span v-if="it.badge" class="tab-badge mono">{{ it.badge }}</span>
      </span>
      <span class="tab-label">{{ it.short }}</span>
    </RouterLink>
  </nav>
</template>

<style scoped>
.side {
  position: sticky; top: 0; height: 100vh; height: 100dvh;
  width: var(--sidebar); flex: none;
  display: flex; flex-direction: column; gap: 4px;
  padding: 22px 14px 18px;
  border-right: 1px solid var(--line); background: var(--bg);
}
.brand { display: flex; align-items: center; gap: 10px; padding: 4px 10px 26px; }
.brand-name { font-size: 22px; font-weight: 700; letter-spacing: -0.045em; }
.links { display: flex; flex-direction: column; gap: 2px; }
.link {
  position: relative; display: flex; align-items: center; gap: 12px;
  height: 46px; padding: 0 12px 0 14px; border-radius: var(--r-md);
  color: var(--fg-2); font-size: 15.5px; font-weight: 500; letter-spacing: -0.01em;
}
.link:hover { background: var(--bg-sunken); color: var(--fg); }
.link.active { background: var(--bg-sunken); color: var(--fg); font-weight: 650; }
.marker { position: absolute; left: 0; top: 14px; width: 3px; height: 18px; border-radius: 2px; background: transparent; }
.link.active .marker { background: var(--accent); }
.label { flex: 1; }
.badge {
  min-width: 22px; height: 20px; padding: 0 7px; border-radius: 999px;
  display: inline-grid; place-items: center;
  background: var(--accent); color: var(--on-accent); font-size: 11.5px; font-weight: 600;
}
.conn {
  margin-top: auto; display: flex; align-items: center; gap: 8px; padding: 0 12px 10px;
  font-size: 13px; font-weight: 600; color: var(--fg-2);
}
.conn i { width: 8px; height: 8px; border-radius: 999px; background: var(--fg-3); }
.conn.asli i { background: var(--accent); }
.conn.simulasi i { background: var(--warn); }
.station { display: flex; align-items: center; gap: 10px;
  padding: 11px 12px; border-radius: 12px; background: var(--bg-sunken);
}
.avatar {
  width: 34px; height: 34px; border-radius: 999px; display: grid; place-items: center;
  background: var(--accent-soft); color: var(--accent-strong); font-weight: 700; font-size: 12.5px;
}
.who { display: flex; flex-direction: column; min-width: 0; }
.name { font-weight: 600; font-size: 14.5px; }
.role { font-size: 10.5px; color: var(--fg-3); letter-spacing: .05em; }

.tabbar { display: none; }

@media (max-width: 860px) {
  .side { display: none; }
  .tabbar {
    position: fixed; z-index: 40; left: 0; right: 0; bottom: 0;
    display: grid; grid-template-columns: repeat(4, 1fr);
    padding: 6px max(8px, env(safe-area-inset-right, 0px)) calc(6px + env(safe-area-inset-bottom, 0px)) max(8px, env(safe-area-inset-left, 0px));
    background: var(--bg); border-top: 1px solid var(--line);
  }
  .tab {
    display: flex; flex-direction: column; align-items: center; gap: 3px;
    padding: 6px 2px; border-radius: 10px; color: var(--fg-3); font-size: 11px; font-weight: 500;
  }
  .tab.active { color: var(--fg); font-weight: 650; }
  .tab.active .tab-ic { color: var(--accent-strong); }
  .tab-ic { position: relative; }
  .tab-badge {
    position: absolute; top: -5px; right: -11px; min-width: 18px; height: 16px; padding: 0 5px;
    border-radius: 999px; background: var(--accent); color: var(--on-accent);
    font-size: 10px; font-weight: 600; display: grid; place-items: center;
  }
}
</style>

<script setup lang="ts">
import { ref } from 'vue'

const title = ref('Literate Sniffle')
</script>

<template>
  <div class="content">
    <header>
      <h1>{{ title }}</h1>
      <nav>
        <router-link to="/" class="nav-link">Upload</router-link>
        <router-link to="/balance" class="nav-link">Balances</router-link>
      </nav>
    </header>

    <main>
      <router-view />
    </main>
  </div>
</template>

<style>
#app {
  display: flex;
  justify-content: center;
  min-height: 100vh;
  width: 450px
}
</style>

<style scoped>
.content {
  min-width: 800px;
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
  margin-top: 60px;
  display: flex;
  flex-direction: column;
  width: 100%;
}

header {
  margin-bottom: 2rem;
  text-align: center;
}

h1 {
  color: #42b883;
  margin-bottom: 1rem;
}

nav {
  display: flex;
  justify-content: center;
  gap: 1rem;
}

.nav-link {
  display: inline-block;
  padding: 0.5rem 1rem;
  background: #f8f9fa;
  color: #42b883;
  text-decoration: none;
  border-radius: 4px;
  transition: all 0.3s;
  border: 2px solid transparent;
}

.nav-link:hover {
  background: #42b883;
  color: white;
}

.nav-link.router-link-active {
  background: #42b883;
  color: white;
  border-color: #369870;
}

main {
  margin-top: 2rem;
}
</style>
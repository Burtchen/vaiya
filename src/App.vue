<template>
  <img alt="Vue logo" src="./assets/logo.png" />
  <FileSelect />
</template>

<script>
import FileSelect from "./components/FileSelect.vue";

export default {
  name: "App",
  components: {
    FileSelect
  }
};
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>

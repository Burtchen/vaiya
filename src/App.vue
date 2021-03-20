<template>
  <Card class="p-mx-auto app-container">
    <template #header> <h1>Vaiya</h1> </template>
    <template #content>
      <FileSelect />
    </template>
  </Card>
</template>

<script>
import FileSelect from "./components/FileSelect.vue";
import "primeflex/primeflex.css";
import Card from "primevue/card";

export default {
  name: "App",
  components: {
    Card,
    FileSelect
  }
};
</script>

<style>
body {
  background: #f2f0ce;
}
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}

h1 {
  margin-bottom: 0;
}

.app-container {
  margin-top: 60px;
  padding-top: 40px;
  max-width: 600px;
}
</style>

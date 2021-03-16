<template>
  <div class="file-select">
    <h2>Upload PDF or ZIP files</h2>
    <input type="file" @change="getFiles" />
    <ul id="array-rendering">
      <li v-for="file in files" :key="file.name">
        {{ file.name }}
      </li>
    </ul>
  </div>
  <form v-show="files?.length > 0" @submit.prevent="onSubmit">
    <button v-show="canvased" @click="generatePdf">Labelchef!</button>
    <input type="radio" id="a5" name="size" value="a5" v-model="size" /><label
      for="a5"
      >A5</label
    >
    <input type="radio" id="a4" name="size" value="a5" v-model="size" /><label
      for="a4"
      >A4</label
    >
  </form>
  <canvas
    v-for="(file, index) in files"
    :id="['originals-' + index]"
    :key="file.name"
  ></canvas> </template
>∏

<script>
import jsPDF from "jspdf";

export default {
  name: "FileSelect",
  data: function() {
    return {
      files: [],
      size: null,
      canvased: false
    };
  },
  methods: {
    async readZipFiles(zipArchive) {
      // eslint-disable-next-line no-undef
      const new_zip = new JSZip();
      let zipEntries = [];
      let pdfFiles = [];
      const archiveData = await Promise.resolve(new_zip.loadAsync(zipArchive));
      archiveData.forEach(function(relativePath, zipEntry) {
        zipEntries.push(zipEntry);
      });
      await Promise.all(
        zipEntries.map(async zipEntry => {
          const returnObject = {
            name: zipEntry.name
          };
          const content = await Promise.resolve(zipEntry.async("arraybuffer"));
          // eslint-disable-next-line no-undef
          await pdfjsLib.getDocument(content).promise.then(function(pdf) {
            returnObject.pdf = pdf;
          });
          pdfFiles.push(returnObject);
        })
      );
      return pdfFiles;
    },
    async readFileAsync(file) {
      return new Promise((resolve, reject) => {
        let reader = new FileReader();

        reader.onload = () => {
          resolve(reader.result);
        };

        reader.onerror = reject;

        reader.readAsArrayBuffer(file);
      });
    },

    async readPdfFile(pdf) {
      const returnObject = {
        name: pdf.name
      };
      const content = await this.readFileAsync(pdf);
      // eslint-disable-next-line no-undef
      await pdfjsLib.getDocument(content).promise.then(function(pdf) {
        returnObject.pdf = pdf;
      });
      return returnObject;
    },
    async getFiles(event) {
      const files = [];
      for (const file of event.target.files) {
        if (file.type === "application/pdf") {
          files.push(await this.readPdfFile(file));
        } else if (file.type === "application/zip") {
          files.push(Object.values(await this.readZipFiles(file)));
        } else {
          console.warn("unsupported file type");
        }
      }
      this.files = files;

      await this.processFiles();
    },
    async processFiles() {
      let index = 0;
      for (const file of this.files) {
        const page = await file.pdf.getPage(1);
        const viewport = page.getViewport({ scale: 3 });
        const canvas = document.getElementById(`originals-${index}`);
        const renderContext = {
          canvasContext: canvas.getContext("2d"),
          viewport
        };
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        index += 1;

        await page.render(renderContext);
        this.canvased = true;
      }
    },
    async generatePdf() {
      let index = 0;
      const labelPdf =
        this.size === "a4"
          ? new jsPDF()
          : new jsPDF({
              orientation: "l",
              format: "a5"
            });
      const receiptsPdf = new jsPDF();
      const today = new Date().toLocaleDateString();
      labelPdf.deletePage(1);
      receiptsPdf.deletePage(1);
      // eslint-disable-next-line no-unused-vars
      for (const file of this.files) {
        const canvas = document.getElementById(`originals-${index}`);
        const data = canvas.toDataURL("imaage/jpg", 1);
        const width = canvas.width / 8.5;
        const height = canvas.height / 8.5;
        if (index % 2 === 0) {
          receiptsPdf.addPage();
          labelPdf.addPage();
          labelPdf.addImage(data, "jpg", 3, -4, width, height);
          if (this.size === "a4") {
            receiptsPdf.addImage(data, "jpg", 3, -4, width, height);
            // receiptsPdf.rect(3, -150, width, height, "F");
          } else {
            labelPdf.addImage(data, "jpg", 3, 14, width, height);
          }
        } else {
          receiptsPdf.addImage(data, "jpg", 3, -150, width, height);
          if (this.size === "a4") {
            labelPdf.addImage(data, "jpg", 3, 150, width, height);
          } else {
            labelPdf.addPage();
            labelPdf.addImage(data, "jpg", 3, 14, width, height);
          }
        }
        index += 1;
      }
      labelPdf.save(`${today}-labels.pdf`);
      receiptsPdf.save(`${today}-receipts.pdf`);
    }
  },
  props: {}
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
h3 {
  margin: 40px 0 0;
}
ul {
  list-style-type: none;
  padding: 0;
}
li {
  display: inline-block;
  margin: 0 10px;
}
a {
  color: #42b983;
}
canvas {
  visibility: hidden;
}
</style>

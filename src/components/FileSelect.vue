<template>
  <div class="file-select">
    <p>Start the label optimization with an upload</p>
    <FileUpload
      name="upload[]"
      mode="basic"
      url="./upload"
      accept=".pdf,.zip"
      :multiple="true"
      :previewWidth="0"
      :customUpload="true"
      chooseLabel="Select Files"
      @uploader="getFiles"
      :auto="true"
      :showCancelButton="false"
      class="p-my-4"
      ><template #empty>
        <p>You can also drag and drop files here.</p>
      </template></FileUpload
    >
    <OrderList
      v-if="files?.length > 0"
      v-model="files"
      listStyle="height:auto"
      dataKey="name"
      class="p-my-2"
    >
      <template #header>
        List of Files
      </template>
      <template #item="slotprops">
        <span>{{ slotprops.item.name }}</span>
      </template>
    </OrderList>
  </div>
  <form v-if="files?.length > 0" @submit.prevent="onSubmit">
    <SelectButton
      v-model="size"
      :options="sizes"
      class="p-my-2 size-button-group"
    />
    <Button
      v-show="canvased"
      label="Vaiya!"
      class="p-button-lg"
      @click="generatePdf"
    />
  </form>
  <ProgressBar
    class="p-my-4"
    :value="progress"
    v-show="progress !== null"
    :showValue="false"
  />

  <canvas
    hidden
    v-for="(file, index) in files"
    :id="['originals-' + index]"
    :key="file.name"
  ></canvas> </template
>∏

<script>
import jsPDF from "jspdf";

import FileUpload from "primevue/fileupload";
import Button from "primevue/button";
import SelectButton from "primevue/selectbutton";
import OrderList from "primevue/orderlist";
import ProgressBar from "primevue/progressbar";

export default {
  name: "FileSelect",
  data: function() {
    return {
      value1: "Off",
      options: ["Off", "On"],
      files: [],
      size: "a5",
      sizes: ["a4", "a5"],
      canvased: false,
      progress: null
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
      let files = [];
      for (const file of event.files) {
        if (file.type === "application/pdf") {
          files = [...files, await this.readPdfFile(file)];
        } else if (file.type === "application/zip") {
          files = [...files, ...Object.values(await this.readZipFiles(file))];
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
      this.progress = 0;
      const labelPdf =
        this.size === "a4"
          ? new jsPDF()
          : new jsPDF({
              orientation: "l",
              format: "a5"
            });
      const today = new Date().toLocaleDateString();
      labelPdf.deletePage(1);
      let receiptsData = "";
      for (const file of this.files) {
        const page = await file.pdf.getPage(1);
        this.progress = ((index + 1) / this.files.length) * 100;
        const textContent = await page.getTextContent();
        let receiptsContentForThisPage = "";
        let previousItem;
        textContent.items.forEach(textContentItem => {
          receiptsContentForThisPage +=
            previousItem === "Sendungsnr.:"
              ? textContentItem.str.replace(/(\.|\s)/g, "") + "\n"
              : textContentItem.str + "\n";
          previousItem = textContentItem.str;
        });
        receiptsData +=
          receiptsContentForThisPage.substring(
            receiptsContentForThisPage.lastIndexOf("Empfänger"),
            receiptsContentForThisPage.lastIndexOf("Bei Einlieferung")
          ) + "\n\n";

        const canvas = document.getElementById(`originals-${index}`);
        const data = canvas.toDataURL("image/jpg", 1);
        const width = canvas.width / 8.5;
        const height = canvas.height / 8.5;
        if (index % 2 === 0) {
          labelPdf.addPage();
          if (this.size === "a4") {
            labelPdf.addImage(data, "jpg", 3, -4, width, height);
          } else {
            labelPdf.addImage(data, "jpg", 3, 14, width, height);
          }
        } else {
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
      const file = new Blob([receiptsData], { type: "txt" });
      const a = document.createElement("a"),
        url = URL.createObjectURL(file);
      a.href = url;
      a.download = `${today}-receipts.txt`;
      document.body.appendChild(a);
      a.click();
      setTimeout(function() {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }, 0);
      this.progress = null;
    }
  },
  components: {
    Button,
    FileUpload,
    SelectButton,
    OrderList,
    ProgressBar
  }
};
</script>

<style>
h3 {
  margin: 40px 0 0;
}
a {
  color: #42b983;
}

.p-orderlist {
  text-align: left;
}

.p-orderlist .p-orderlist-controls {
  display: none !important;
}

.size-button-group {
  transform: scale(0.7);
  text-transform: uppercase;
}
</style>

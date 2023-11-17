<template>
  <div class="file-select">
    <p>Start the label optimization with an upload</p>
    <FileUpload
      name="upload[]"
      @select="getFiles"
      @upload="getFiles"
      url="./upload"
      accept=".pdf,.zip"
      :auto="false"
      :multiple="true"
      :previewWidth="0"
      :showCancelButton="false"
      chooseLabel="Select Files"
      ><template #empty>
        <p>You can also drag and drop files here.</p>
      </template></FileUpload
    >
    <OrderList
      v-if="files?.length > 0"
      v-model="files"
      listStyle="height:auto"
      dataKey="name"
      class="p-mt-6 p-mb-2"
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
    <Button
      v-show="canvased"
      label="UPS"
      class="p-button-lg p-mr-4"
      @click="() => generatePdf(-100)"
    />
    <Button
      v-show="canvased"
      label="DHL"
      class="p-button-lg"
      @click="() => generatePdf(14)"
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
    :id="['originals-content-' + index]"
    :key="file.name"
  ></canvas
  ><canvas
    hidden
    v-for="(file, index) in files"
    :id="['originals-customs-' + index]"
    :key="file.name"
  ></canvas>
</template>

<script>
import jsPDF from "jspdf";

import FileUpload from "primevue/fileupload";
import Button from "primevue/button";
import OrderList from "primevue/orderlist";
import ProgressBar from "primevue/progressbar";

export default {
  name: "FileSelect",
  data: function() {
    return {
      value1: "Off",
      options: ["Off", "On"],
      files: [],
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
      console.log(event)
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
        const numberOfPages = file.pdf._pdfInfo.numPages;
        const contentPage = await file.pdf.getPage(numberOfPages === 1 ? 1 : 2);
        const contentViewport = contentPage.getViewport({ scale: 3 });
        const contentCanvas = document.getElementById(
          `originals-content-${index}`
        );
        const contentRenderContext = {
          canvasContext: contentCanvas.getContext("2d"),
          viewport: contentViewport
        };
        contentCanvas.height = contentViewport.height;
        contentCanvas.width = contentViewport.width;
        await contentPage.render(contentRenderContext);

        if (numberOfPages === 2) {
          const customsPage = await file.pdf.getPage(1);
          const customsViewport = customsPage.getViewport({ scale: 3 });
          const customsCanvas = document.getElementById(
            `originals-customs-${index}`
          );
          const customsRenderContext = {
            canvasContext: customsCanvas.getContext("2d"),
            viewport: customsViewport
          };
          customsCanvas.height = customsViewport.height;
          customsCanvas.width = customsViewport.width;
          await customsPage.render(customsRenderContext);
        }
        index += 1;

        this.canvased = true;
      }
    },
    async generatePdf(offset) {
      let index = 0;
      this.progress = 0;
      const labelPdf = new jsPDF({
        orientation: "l",
        format: "a5"
      });
      const today = new Date().toLocaleDateString();
      labelPdf.deletePage(1);
      let receiptsData = "";
      for (const file of this.files) {
        const numberOfPages = file.pdf._pdfInfo.numPages;
        const contentPage = await file.pdf.getPage(numberOfPages === 1 ? 1 : 2);
        this.progress = ((index + 1) / this.files.length) * 100;
        const textContent = await contentPage.getTextContent();
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

        const contentCanvas = document.getElementById(
          `originals-content-${index}`
        );
        labelPdf.addPage();
        labelPdf.addImage(
          contentCanvas.toDataURL("image/jpg", 1),
          "jpg",
          3,
            offset,
          contentCanvas.width / 8.5,
          contentCanvas.height / 8.5
        );
        if (numberOfPages === 2) {
          const customsCanvas = document.getElementById(
            `originals-customs-${index}`
          );
          labelPdf.addPage();
          labelPdf.addImage(
            customsCanvas.toDataURL("image/jpg", 1),
            "jpg",
            3,
              offset,
            customsCanvas.width / 8.5,
            customsCanvas.height / 8.5
          );
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
      // a.click();
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
</style>

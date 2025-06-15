window.addEventListener("DOMContentLoaded", async () => {
  console.log("✅ 복원 코드 실행됨");

  const type = localStorage.getItem("mediaType");
  const videoData = localStorage.getItem("mediaData");
  const imageHex = localStorage.getItem("mediaPreview");
  const imageList = JSON.parse(localStorage.getItem("mediaDataList") || "[]");
  const name = localStorage.getItem("mediaName");

  const camera = document.getElementById("camera");
  const fileName = document.getElementById("fileName");
  const cameraImg = document.getElementById("camera_img");
  const cameraText = document.getElementById("camera_text");

  if (!camera) {
    console.error("❌ #camera 요소가 없습니다");
    return;
  }

  if (name && fileName) {
    fileName.textContent = name;
  }

  // ✅ 1. 동영상 복원
  if (type === "video" && videoData) {
    console.log("✅ 동영상 복원 및 실시간 YOLO 추론 시작");

    const video = document.createElement("video");
    video.src = videoData;
    video.controls = true;
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    video.style.width = "100%";
    video.style.height = "100%";
    video.style.objectFit = "cover";

    const camera = document.getElementById("camera");
    camera.innerHTML = "";
    camera.appendChild(video);

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    const table = document.querySelector("#resultTable tbody");

    function processNextFrame() {
      const timeInVideo = video.currentTime;
      const hhmmss = new Date(timeInVideo * 1000).toISOString().substr(11, 8);
      if (video.paused || video.ended) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(async (blob) => {
        if (!blob) return;

        const formData = new FormData();
        formData.append("media", blob);

        try {
          const response = await fetch("/detect/", {
            method: "POST",
            body: formData,
          });

          if (!response.ok) {
            const text = await response.text();
            console.error("❌ YOLO 응답 실패:", text);
            return;
          }

          const result = await response.json();
          const now = new Date().toLocaleTimeString();

          let detections = [];

          if (Array.isArray(result.detections[0])) {
            detections = result.detections.map((detList) => {
              if (!Array.isArray(detList) || detList.length === 0) {
                return [{
                  class_name: "no_target",
                  confidence: 0,
                  mediaType: "video",
                  time: now,
                  fileName: `video_${hhmmss}`
                }];
              } else {
                return detList.map(det => ({
                  class_name: det.class_name || "no_target",
                  confidence: det.confidence || 0,
                  mediaType: "video",
                  time: now,
                  fileName: `video_${hhmmss}`
                }));
              }
            }).flat();
          } else {
            if (Array.isArray(result.detections) && result.detections.length > 0) {
              detections = result.detections.map(det => ({
                class_name: det.class_name || "no_target",
                confidence: det.confidence || 0,
                mediaType: "video",
                time: now,
                fileName: `video_${hhmmss}`
              }));
            } else {
              detections = [{
                class_name: "no_target",
                confidence: 0,
                mediaType: "video",
                time: now,
                fileName: `video_${hhmmss}`
              }];
            }
          }

          const log = JSON.parse(localStorage.getItem("detectionResultLog") || "[]");
          const updatedLog = log.concat(detections.map(det => ({
            ...det,
            time: now,
            fileName: det.fileName || "video_frame"
          })));
          localStorage.setItem("detectionResultLog", JSON.stringify(updatedLog));

          detections.forEach(det => {
            const row = document.createElement("tr");
            row.innerHTML = `
              <td>${det.time || now}</td>
              <td>${det.fileName || "-"}</td>
              <td>${det.class_name || "no_target"}</td>
            `;
            table.appendChild(row);

            const targetBox = document.querySelector(".text.number1");
            if (targetBox) targetBox.textContent = det.class_name || "no_target";
          });

          setTimeout(processNextFrame, 1000);
        } catch (err) {
          console.error("❌ YOLO 추론 중 오류:", err);
        }
      }, "image/jpeg");
    }

    video.addEventListener("playing", () => {
      console.log("✅ 재생 시작됨");
      processNextFrame();
    });
  }

  // ✅ 2. 이미지 복원
  else if (type === "image") {
    if (imageList.length > 1) {
      console.log("✅ 다중 이미지 복원");
      camera.innerHTML = "";
      imageList.forEach(src => {
        const img = document.createElement("img");
        img.src = src;
        img.style.width = "100px";
        img.style.margin = "5px";
        camera.appendChild(img);
      });
    } else if (imageHex) {
      console.log("✅ 단일 이미지 복원");
      const binary = new Uint8Array(imageHex.match(/.{1,2}/g).map(h => parseInt(h, 16)));
      const blob = new Blob([binary], { type: "image/jpeg" });
      const url = URL.createObjectURL(blob);
      camera.style.backgroundImage = `url(${url})`;
      camera.style.backgroundSize = "cover";
      camera.style.backgroundPosition = "center";
      camera.style.backgroundRepeat = "no-repeat";
    } else {
      console.warn("⚠️ 복원할 이미지가 없습니다.");
    }

    if (cameraImg) cameraImg.style.display = "none";
    if (cameraText) cameraText.style.display = "none";
  }
  else if (type === "camera") {
    try {
      // ✅ 1. 웹캠 연결
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });

      const video = document.createElement("video");
      video.srcObject = stream;
      video.autoplay = true;
      video.playsInline = true;
      video.muted = true;
      video.style.width = "100%";
      video.style.height = "100%";
      video.style.objectFit = "cover";

      camera.innerHTML = "";
      camera.appendChild(video);

      if (cameraImg) cameraImg.style.display = "none";
      if (cameraText) cameraText.style.display = "none";

      // ✅ 2. YOLO 실시간 감지 시작
      startAutoCaptureFromVideo(video, 1000);

      // ✅ 3. 복원 이미지가 있다면 배경으로 표시 (선택사항)
      if (imageHex) {
        const binary = new Uint8Array(imageHex.match(/.{1,2}/g).map(h => parseInt(h, 16)));
        const blob = new Blob([binary], { type: "image/jpeg" });
        const url = URL.createObjectURL(blob);
        camera.style.backgroundImage = `url(${url})`;
        camera.style.backgroundSize = "cover";
        camera.style.backgroundPosition = "center";
        camera.style.backgroundRepeat = "no-repeat";
      }

    } catch (err) {
      console.error("❌ 카메라 접근 실패:", err);
      cameraText.textContent = "⚠️ 카메라 연결 실패";
    }
  }

  const detectionLog = JSON.parse(localStorage.getItem("detectionResultLog") || "[]");
  const newDetections = JSON.parse(localStorage.getItem("detectionResult") || "[]");
  const isAlreadyMerged = sessionStorage.getItem("mergedToLog") === "true";

  const updatedDetections = isAlreadyMerged
    ? detectionLog
    : [...detectionLog, ...newDetections];

  if (!isAlreadyMerged) {
    localStorage.setItem("detectionResultLog", JSON.stringify(updatedDetections));
    sessionStorage.setItem("mergedToLog", "true");
  }

  updateResultTable(updatedDetections);

  document.querySelector(".resetTableBtn")?.addEventListener("click", () => {
    document.querySelector("#resultTable tbody").innerHTML = "";
    localStorage.removeItem("detectionResultLog");
    alert("✅ 테이블과 기록이 초기화되었습니다!");
  });

  const log = JSON.parse(localStorage.getItem("detectionResultLog") || "[]");
  console.log("✅ 복원 대상 결과 수:", log.length);
  console.table(log);
});

function updateResultTable(detections, { reset = true } = {}) {
  const table = document.querySelector("#resultTable tbody");
  if (!table) return;

  if (reset) {
    table.innerHTML = "";
  }

  detections.forEach(det => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${det.time || "-"}</td>
      <td>${det.fileName || "-"}</td>
      <td>${det.class_name || "no_target"}</td>
    `;
    table.appendChild(row);
  });

  const targetBox = document.querySelector(".text.number1");
  if (targetBox && detections.length > 0) {
    targetBox.textContent = detections[detections.length - 1].class_name || "no_target";
  }
}

function startAutoCaptureFromVideo(video, interval = 1000) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  setInterval(() => {
    if (!video || video.readyState < 2) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(async (blob) => {
      if (!blob) return;

      const formData = new FormData();
      formData.append("media", blob, "frame.jpg");

      try {
        const response = await fetch("/detect/", {
          method: "POST",
          body: formData,
        });

        const result = await response.json();
        const now = new Date().toLocaleTimeString();

        const detections = result.detections?.length > 0
          ? result.detections
          : [{ class_name: "no_target", confidence: 0 }];

        const formatted = detections.map(det => ({
          ...det,
          time: now,
          mediaType: "camera",
          fileName: "webcam"
        }));

        const prev = JSON.parse(localStorage.getItem("detectionResultLog") || "[]");
        const updated = prev.concat(formatted);

        localStorage.setItem("detectionResult", JSON.stringify(formatted));
        localStorage.setItem("detectionResultLog", JSON.stringify(updated));

        if (result.image) {
          localStorage.setItem("mediaPreview", result.image);
        }

        updateResultTable(formatted, { reset: false });

      } catch (err) {
        console.error("❌ YOLO 전송 실패:", err);
      }
    }, "image/jpeg");
  }, interval);
}

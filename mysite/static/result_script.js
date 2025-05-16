window.addEventListener("DOMContentLoaded", () => {
  console.log("✅ 복원 코드 실행됨");

  const type = localStorage.getItem("mediaType");
  const videoData = localStorage.getItem("mediaData");
  const imageHex = localStorage.getItem("mediaPreview");
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

  // ✅ 1. 이미지 복원
  if (imageHex) {
    console.log("✅ YOLO 결과 이미지 복원");
    const binary = new Uint8Array(imageHex.match(/.{1,2}/g).map(h => parseInt(h, 16)));
    const blob = new Blob([binary], { type: "image/jpeg" });
    const url = URL.createObjectURL(blob);
    camera.style.backgroundImage = `url(${url})`;
    camera.style.backgroundSize = "cover";
    camera.style.backgroundPosition = "center";
    camera.style.backgroundRepeat = "no-repeat";
    if (cameraImg) cameraImg.style.display = "none";
    if (cameraText) cameraText.style.display = "none";
  }

  // ✅ 2. 동영상 복원
  else if (type === "video" && videoData) {
    console.log("✅ 동영상 복원");
    const video = document.createElement("video");
    video.src = videoData;
    video.controls = true;
    video.autoplay = true;
    video.style.width = "100%";
    video.style.height = "100%";
    video.style.objectFit = "cover";
    camera.innerHTML = "";
    camera.appendChild(video);
  }

  else {
    console.warn("⚠️ mediaPreview 또는 mediaData가 비어 있음");
  }

  // ✅ 3. YOLO 결과 테이블 복원
  const detections = JSON.parse(localStorage.getItem("detectionResultLog") || "[]");
  const newDetections = JSON.parse(localStorage.getItem("detectionResult") || "[]");
  const updatedDetections = detections.concat(newDetections);
  localStorage.setItem("detectionResultLog", JSON.stringify(updatedDetections));

  const table = document.querySelector("#resultTable tbody");
  if (!table) {
    console.error("❌ #resultTable tbody 요소를 찾을 수 없습니다");
    return;
  }

  updatedDetections.forEach(det => {
    const row = document.createElement("tr");
    const className = det.class_name || "no_target";

    row.innerHTML = `
      <td>${det.time || "-"}</td>
      <td>${det.model || "YOLOv8m"}</td>
      <td>${className}</td>
    `;
    table.appendChild(row);

    const targetBox = document.querySelector(".text.number1");
    if (targetBox) {
      targetBox.textContent = className;
    }
  });

  if (updatedDetections.length === 0) {
  console.warn("⚠️ YOLO 결과가 비어있습니다 (detectionResult 없음)");

  // ✅ 텍스트 박스에 no_target 표시
  const targetBox = document.querySelector(".text.number1");
  if (targetBox) {
    targetBox.textContent = "no_target";
  }

  // ✅ 테이블에도 no_target 행 추가
  const table = document.querySelector("#resultTable tbody");
  if (table) {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>-</td>
      <td>YOLOv8m</td>
      <td>no_target</td>
    `;
    table.appendChild(row);
  }
  }

  document.querySelector(".resetTableBtn").addEventListener("click", () => {
  const tbody = document.querySelector("#resultTable tbody");
  if (tbody) {
    tbody.innerHTML = "";
  }

  localStorage.removeItem("detectionResultLog");

  alert("✅ 테이블과 기록이 초기화되었습니다!");
  });

  if (updatedDetections.length === 0) {
    console.warn("⚠️ YOLO 결과가 비어있습니다");
  }
});

let stream = null;
let video = null;
let cameraClicked = false;
const fileInput = document.getElementById("fileInput");
const camera = document.getElementById("camera");
const cameraText = document.getElementById("camera_text");
const canvas = document.getElementById("captureCanvas");
const ctx = canvas.getContext("2d");

let yoloEnabled = false;

// ✅ 선택 옵션 저장 + 클릭 시 파일 선택까지
const options = document.querySelectorAll(".select-option");
options.forEach(option => {
  option.addEventListener("click", () => {
    options.forEach(o => o.classList.remove("active"));
    option.classList.add("active");

    const selected = option.textContent;
    if (selected === "이미지") {
      localStorage.setItem("mediaType", "image");
      fileInput.setAttribute("accept", "image/*");
    } else if (selected === "동영상") {
      localStorage.setItem("mediaType", "video");
      fileInput.setAttribute("accept", "video/*");
    }

    // ✅ 클릭 시 즉시 파일 선택창 열기
    fileInput.click();
  });
});

// ✅ 1. 웹캠 연결
camera.addEventListener("click", async () => {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: true });

    video = document.createElement("video");
    video.srcObject = stream;
    video.autoplay = true;
    video.playsInline = true;
    video.muted = true;
    video.style.width = "100%";
    video.style.height = "100%";
    video.style.objectFit = "cover";

    camera.innerHTML = "";
    camera.appendChild(video);
    cameraText.style.display = "none";

    localStorage.setItem("mediaType", "camera");

  } catch (err) {
    console.error("❌ 카메라 접근 실패:", err);
    cameraText.textContent = "⚠️ 카메라를 사용할 수 없습니다.";
  }
});

fileInput.addEventListener("change", async () => {
  const files = Array.from(fileInput.files);
  const selectedType = localStorage.getItem("mediaType");

  const file = files[0];                 // ✅ 첫 파일을 가져오고
  const fileType = file.type;            // ✅ 타입을 직접 정의한다

  if (files.length === 0) return;

  // ✅ 파일 이름 나열
  const nameList = files.map(file => file.name);
  const fileNameDiv = document.getElementById("fileName");
  fileNameDiv.innerHTML = nameList.map(name => `<span style="margin-right: 10px;">${name}</span>`).join("");

  // ✅ 선택된 유형과 모든 파일의 실제 유형이 일치하는지 검사
  const typePrefix = selectedType === "image" ? "image/" :
                    selectedType === "video" ? "video/" : null;

  const isAllValid = typePrefix && files.every(file => file.type.startsWith(typePrefix));

  if (!isAllValid) {
    alert(`⚠️ '${selectedType}'를 선택했으나 해당 유형이 아닌 파일이 포함되어 있습니다.`);
    fileInput.value = "";
    fileNameDiv.innerHTML = "";
    return;
  }

  // ✅ 이미지 처리
  if (fileType.startsWith("image/")) {
    const files = Array.from(fileInput.files);
    const camera = document.getElementById("camera");
    const cameraImg = document.getElementById("camera_img");
    const cameraText = document.getElementById("camera_text");

    camera.innerHTML = ""; // 기존 내용 제거

    const readPromises = files.map(file => {
      return new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = function (e) {
          resolve({
            data: e.target.result,
            name: file.name
          });
        };
        reader.readAsDataURL(file);
      });
    });

    const results = await Promise.all(readPromises);
    const imageDataList = results.map(r => r.data);
    const nameList = results.map(r => r.name);

    if (results.length === 1) {
      // ✅ 단일 이미지 → 배경 이미지로 표시
      camera.style.backgroundImage = `url(${results[0].data})`;
      camera.style.backgroundSize = "cover";
      camera.style.backgroundPosition = "center";
      camera.style.backgroundRepeat = "no-repeat";
    } else {
      // ✅ 여러 이미지 → 썸네일 나열
      camera.style.backgroundImage = "none";
      results.forEach(result => {
        const img = document.createElement("img");
        img.src = result.data;
        img.style.width = "100px";
        img.style.margin = "5px";
        camera.appendChild(img);
      });
    }

    if (cameraImg) cameraImg.style.display = "none";
    if (cameraText) cameraText.style.display = "none";

    // 저장
    localStorage.setItem("mediaType", "image");
    localStorage.setItem("mediaDataList", JSON.stringify(imageDataList));
    localStorage.setItem("mediaNameList", JSON.stringify(nameList));
  }

  // ✅ 동영상 처리
  else if (fileType.startsWith("video/")) {
    const formData = new FormData();
    formData.append("media", file);

    try {
      const uploadRes = await fetch("/upload_video/", {
        method: "POST",
        body: formData,
      });

      const result = await uploadRes.json();

      if (result.status === "ok") {
        const videoURL = result.video_url;

        const video = document.createElement("video");
        video.src = videoURL;
        video.controls = true;
        video.autoplay = true;
        video.style.width = "100%";
        video.style.height = "100%";
        video.style.objectFit = "cover";

        camera.innerHTML = "";
        camera.appendChild(video);
        camera.style.backgroundImage = "none";

        localStorage.setItem("mediaType", "video");
        localStorage.setItem("mediaData", videoURL);
        localStorage.setItem("mediaName", fileName);

        localStorage.removeItem("mediaPreview");
      } else {
        alert("❌ 동영상 업로드 실패: " + result.message);
      }
    } catch (err) {
      console.error("❌ 업로드 중 오류 발생:", err);
      alert("❌ 동영상 업로드 중 오류가 발생했습니다.");
    }
  }
});

document.querySelector(".btn1").addEventListener("click", async (e) => {
  const mediaType = localStorage.getItem("mediaType")?.trim() || "";
  const files = Array.from(fileInput.files);

  if (!["image", "video", "camera"].includes(mediaType)) {
    alert("⚠️ 이미지 / 동영상 / 웹캠 중 하나를 선택해주세요.");
    return;
  }

  if ((mediaType === "image" || mediaType === "video") && files.length === 0) {
    alert("⚠️ 파일을 선택해주세요.");
    return;
  }

  // ✅ [1] 이미지 처리
  if (mediaType === "image") {
    localStorage.removeItem("detectionResultLog");
    const formData = new FormData();
    const fileNames = [];

    files.forEach((file) => {
      formData.append("media", file);
      fileNames.push(file.name);
    });

    try {
      const response = await fetch("/detect/", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      const now = new Date().toLocaleTimeString();
      const model = localStorage.getItem("selectedModel") || "YOLOv8m";

      if (result.status !== "ok") {
        alert("❌ YOLO 서버 응답 실패: " + result.message);
        return;
      }

      // ✅ 이미지 미리보기 저장
      if (result.image) {
        localStorage.setItem("mediaPreview", result.image);
      } else if (Array.isArray(result.images) && result.images.length > 0) {
        localStorage.setItem("mediaPreview", result.images[0]);
      }

      // ✅ 감지 결과 처리
      const detectionResults = [];

      if (Array.isArray(result.detections)) {
        if (Array.isArray(result.detections[0])) {
          // 🔍 여러 이미지 처리
          result.detections.forEach((detectionList, i) => {
            const fileName = fileNames[i] || `image_${i + 1}`;
            if (!detectionList || detectionList.length === 0) {
              detectionResults.push({
                class_name: "no_target",
                confidence: 0,
                model,
                time: now,
                mediaType,
                fileName
              });
            } else {
              detectionList.forEach(det => {
                detectionResults.push({
                  class_name: det.class_name || "no_target",
                  confidence: det.confidence || 0,
                  model,
                  time: now,
                  mediaType,
                  fileName
                });
              });
            }
          });
        } else {
          // 🔍 단일 이미지 처리
          const fileName = fileNames[0] || "image";
          if (result.detections.length === 0) {
            detectionResults.push({
              class_name: "no_target",
              confidence: 0,
              model,
              time: now,
              mediaType,
              fileName
            });
          } else {
            result.detections.forEach(det => {
              detectionResults.push({
                class_name: det.class_name || "no_target",
                confidence: det.confidence || 0,
                model,
                time: now,
                mediaType,
                fileName
              });
            });
          }
        }
      }

      localStorage.setItem("detectionResultLog", JSON.stringify(detectionResults));
      window.location.href = e.target.dataset.url;

    } catch (err) {
      console.error("❌ YOLO 요청 중 에러:", err);
      alert("❌ YOLO 요청 중 오류 발생");
    }
  }

  // ✅ [2] 동영상: 추론 없이 이동
  else if (mediaType === "video") {
    window.location.href = e.target.dataset.url;
  }

  // ✅ [3] 웹캠: 실시간 YOLO 실행
  else if (mediaType === "camera") {
    window.location.href = e.target.dataset.url;
  }
});
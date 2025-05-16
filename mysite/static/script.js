let cameraClicked = false;
const fileInput = document.getElementById("fileInput");
const camera = document.getElementById("camera");

// 선택 옵션 저장 + 파일 선택 제한
const options = document.querySelectorAll(".select-option");
options.forEach(option => {
  option.addEventListener("click", () => {
    options.forEach(o => o.classList.remove("active"));
    option.classList.add("active");

    const selected = option.textContent;
    localStorage.setItem("mediaType", selected);

    // 업로드 허용 타입 설정
    if (selected === "이미지") {
      fileInput.setAttribute("accept", "image/*");
    } else if (selected === "동영상") {
      fileInput.setAttribute("accept", "video/*");
    }
  });
});

camera.addEventListener("click", () => {
  const selectedType = localStorage.getItem("mediaType");
  if (!selectedType) {
    alert("⚠️ 먼저 '동영상' 또는 '이미지'를 선택해주세요.");
    return;
  }
  cameraClicked = true;
  fileInput.click();
});

fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  const selectedType = localStorage.getItem("mediaType");

  if (!file) return;

  const fileName = file.name;
  const fileType = file.type;

  document.getElementById("fileName").textContent = fileName;

  // ✅ 선택된 유형과 실제 파일 유형이 일치하는지 검사
  if (selectedType === "이미지" && !fileType.startsWith("image/")) {
    alert("⚠️ '이미지'를 선택했으나 이미지 파일이 아닙니다.");
    fileInput.value = "";
    return;
  }

  if (selectedType === "동영상" && !fileType.startsWith("video/")) {
    alert("⚠️ '동영상'을 선택했으나 동영상 파일이 아닙니다.");
    fileInput.value = "";
    return;
  }

  // ✅ 이미지 처리
  if (fileType.startsWith("image/")) {
    const reader = new FileReader();
    reader.onload = function (e) {
      const imageData = e.target.result;
      camera.style.backgroundImage = `url(${imageData})`;
      camera.style.backgroundSize = "cover";
      camera.style.backgroundPosition = "center";

      document.getElementById("camera_img").style.display = "none";
      document.getElementById("camera_text").style.display = "none";

      localStorage.setItem("mediaType", "image");
      localStorage.setItem("mediaData", imageData);
      localStorage.setItem("mediaName", fileName);
    };
    reader.readAsDataURL(file);
  }

  // ✅ 동영상 처리
  else if (fileType.startsWith("video/")) {
    const videoURL = URL.createObjectURL(file);
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
  }
});

document.querySelector(".btn1").addEventListener("click", async (e) => {
  const selectedOption = document.querySelector(".select-option.active");
  const file = fileInput.files[0];

  if (!cameraClicked || !file) {
    alert("⚠️ 파일을 선택해주세요");
    return;
  }

  if (!selectedOption) {
    alert("⚠️ 동영상 또는 이미지를 선택해주세요");
    return;
  }

  const formData = new FormData();
  formData.append("media", file);

  const response = await fetch("/detect/", {
    method: "POST",
    body: formData,
  });

  const result = await response.json();

  if (result.status === "ok") {
    const now = new Date().toLocaleTimeString();
    const model = localStorage.getItem("selectedModel") || "YOLOv8m";
    const mediaType = localStorage.getItem("mediaType");

    let detailedDetections;

    // ✅ 감지된 객체가 없을 경우
    if (!result.detections || result.detections.length === 0) {
      detailedDetections = [{
        class_name: "no_target",
        time: now,
        model: model,
        mediaType: mediaType
      }];
    } else {
      detailedDetections = result.detections.map(det => ({
        ...det,
        class_name: det.class_name || "no_target",  // 혹시라도 class_name이 비어있을 경우
        time: now,
        model: model,
        mediaType: mediaType
      }));
    }

    localStorage.setItem("detectionResult", JSON.stringify(detailedDetections));
    localStorage.setItem("mediaPreview", result.image);

    window.location.href = e.target.dataset.url;
  } else {
    alert("YOLO 추론 실패!");
  }
});
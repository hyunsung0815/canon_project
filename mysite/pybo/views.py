from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from ultralytics import YOLO
import os
import cv2
import numpy as np

def index(request):
    return render(request, 'main.html')

def result(request):
    return render(request, 'result.html')

# 💡 서버 시작 시 모델을 한 번만 로드
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
model_path = os.path.join(BASE_DIR, 'model', 'best.pt')
model = YOLO(model_path)

@csrf_exempt
def detect(request):
    if request.method == 'POST' and request.FILES.getlist('media'):
        files = request.FILES.getlist('media')

        # ✅ 1. 단일 이미지 처리
        if len(files) == 1:
            file = files[0]
            if not file.content_type.startswith("image/"):
                return JsonResponse({'status': 'error', 'message': '이미지 파일이 아닙니다'}, status=400)

            img_bytes = file.read()
            img_np = np.frombuffer(img_bytes, np.uint8)
            img = cv2.imdecode(img_np, cv2.IMREAD_COLOR)

            results = model(img)[0]
            detections = []

            for box in results.boxes:
                cls_id = int(box.cls[0].item())
                confidence = round(float(box.conf[0].item()), 3)
                class_name = model.names[cls_id]

                detections.append({
                    'class_name': class_name,
                    'confidence': confidence,
                })

            _, buffer = cv2.imencode('.jpg', results.plot())
            image_hex = buffer.tobytes().hex()

            return JsonResponse({
                'status': 'ok',
                'type': 'single',
                'detections': detections,
                'image': image_hex
            })

        # ✅ 2. 여러 이미지 처리
        else:
            all_detections = []
            all_images = []

            for file in files:
                if not file.content_type.startswith("image/"):
                    continue

                img_bytes = file.read()
                img_np = np.frombuffer(img_bytes, np.uint8)
                img = cv2.imdecode(img_np, cv2.IMREAD_COLOR)

                results = model(img)[0]
                detections = []

                for box in results.boxes:
                    cls_id = int(box.cls[0].item())
                    confidence = round(float(box.conf[0].item()), 3)
                    class_name = model.names[cls_id]

                    detections.append({
                        'class_name': class_name,
                        'confidence': confidence,
                    })

                _, buffer = cv2.imencode('.jpg', results.plot())
                image_hex = buffer.tobytes().hex()

                all_detections.append(detections)
                all_images.append(image_hex)

            return JsonResponse({
                'status': 'ok',
                'type': 'multiple',
                'detections': all_detections,
                'images': all_images
            })

    return JsonResponse({'status': 'error', 'message': '이미지 파일이 없습니다'}, status=400)

@csrf_exempt
def upload_video(request):
    if request.method == 'POST' and request.FILES.get('media'):
        file = request.FILES['media']

        # MIME 확인
        if not file.content_type.startswith("video/"):
            return JsonResponse({'status': 'error', 'message': '동영상 파일이 아닙니다'}, status=400)

        # 고유 파일명 생성
        import uuid
        file_name = f"video_{uuid.uuid4().hex}.mp4"

        # 저장 경로 지정 (media/ 폴더에 저장)
        from django.conf import settings
        save_path = os.path.join(settings.MEDIA_ROOT, file_name)
        with open(save_path, 'wb+') as f:
            for chunk in file.chunks():
                f.write(chunk)

        # URL 생성
        video_url = settings.MEDIA_URL + file_name
        return JsonResponse({'status': 'ok', 'video_url': video_url})

    return JsonResponse({'status': 'error', 'message': '파일이 없습니다'}, status=400)
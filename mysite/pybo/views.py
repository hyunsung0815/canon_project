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
    if request.method == 'POST' and request.FILES.get('media'):
        file = request.FILES['media']
        img_bytes = file.read()
        img_np = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(img_np, cv2.IMREAD_COLOR)

        results = model(img)[0]
        detections = []

        for box in results.boxes:
            cls_id = int(box.cls[0].item())
            confidence = round(float(box.conf[0].item()), 3)
            xyxy = box.xyxy[0].tolist()
            class_name = model.names[cls_id]

            detections.append({
                'class_name': class_name,
                'confidence': confidence,
                'x1': int(xyxy[0]),
                'y1': int(xyxy[1]),
                'x2': int(xyxy[2]),
                'y2': int(xyxy[3]),
            })

        _, buffer = cv2.imencode('.jpg', results.plot())
        return JsonResponse({
            'status': 'ok',
            'detections': detections,
            'image': buffer.tobytes().hex()
        })

    return JsonResponse({'status': 'error', 'message': 'No file provided'}, status=400)
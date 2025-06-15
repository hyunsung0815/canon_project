from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('result/', views.result, name='result'),
    path('detect/', views.detect, name='detect'),
    path('upload_video/', views.upload_video, name='upload_video'),
]
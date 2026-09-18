"""
URL configuration for backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

from backend.views import (
    CourseTopicDetailView,
    CourseTopicListCreateView,
    CourseVideoDetailView,
    CourseVideoListCreateView,
    CourseViewSet,
)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('backend.users')),
    path('api/courses/', CourseViewSet.as_view({'get': 'list', 'post': 'create'}), name='course-list'),
    path('api/courses/<int:pk>/', CourseViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}), name='course-detail'),
    path('api/courses/<int:course_id>/topics/', CourseTopicListCreateView.as_view(), name='course-topic-list-create'),
    path('api/courses/<int:course_id>/topics/<int:pk>/', CourseTopicDetailView.as_view(), name='course-topic-detail'),
    path('api/topics/<int:topic_id>/videos/', CourseVideoListCreateView.as_view(), name='topic-video-list-create'),
    path('api/topics/<int:topic_id>/videos/<int:pk>/', CourseVideoDetailView.as_view(), name='topic-video-detail'),
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
]

from django.shortcuts import get_object_or_404
from rest_framework import serializers, status, viewsets
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from rest_framework.response import Response
from rest_framework.views import APIView

from backend.models import Course, CourseTopic, CourseVideo


class CourseVideoSerializer(serializers.ModelSerializer):
    class Meta:
        model = CourseVideo
        fields = ['id', 'title', 'description', 'video_url', 'order']


class CourseTopicSerializer(serializers.ModelSerializer):
    videos = CourseVideoSerializer(many=True, required=False)

    class Meta:
        model = CourseTopic
        fields = ['id', 'title', 'description', 'order', 'videos']
        read_only_fields = ['id']

    def create(self, validated_data):
        videos_data = validated_data.pop('videos', [])
        topic = CourseTopic.objects.create(**validated_data)
        for video_data in videos_data:
            CourseVideo.objects.create(topic=topic, **video_data)
        return topic


class CourseListSerializer(serializers.ModelSerializer):
    created_by = serializers.ReadOnlyField(source='created_by.username')

    class Meta:
        model = Course
        fields = [
            'id',
            'title',
            'short_description',
            'level',
            'price',
            'created_by',
            'is_published',
            'created_at',
        ]
        read_only_fields = ['id', 'created_by', 'created_at']


class CourseDetailSerializer(serializers.ModelSerializer):
    created_by = serializers.ReadOnlyField(source='created_by.username')
    topics = CourseTopicSerializer(many=True, read_only=True)

    class Meta:
        model = Course
        fields = [
            'id',
            'title',
            'short_description',
            'description',
            'level',
            'price',
            'created_by',
            'is_published',
            'topics',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']

    def create(self, validated_data):
        topics_data = validated_data.pop('topics', [])
        created_by = validated_data.pop('created_by', None)

        course = Course.objects.create(created_by=created_by, **validated_data)

        for topic_data in topics_data:
            videos_data = topic_data.pop('videos', [])
            topic = CourseTopic.objects.create(course=course, **topic_data)
            for video_data in videos_data:
                CourseVideo.objects.create(topic=topic, **video_data)

        return course


class CourseSerializer(CourseDetailSerializer):
    pass


class CourseViewSet(viewsets.ModelViewSet):
    queryset = Course.objects.all()
    serializer_class = CourseDetailSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_serializer_class(self):
        if self.action == 'list':
            return CourseListSerializer
        return CourseDetailSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def get_queryset(self):
        qs = super().get_queryset()
        if not self.request.user.is_authenticated:
            return qs.filter(is_published=True)
        return qs

    def destroy(self, request, *args, **kwargs):
        course = self.get_object()
        if course.created_by != request.user:
            return Response({"detail": "You do not have permission to delete this course."}, status=status.HTTP_403_FORBIDDEN)
        return super().destroy(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        course = self.get_object()
        if course.created_by != request.user:
            return Response({"detail": "You do not have permission to update this course."}, status=status.HTTP_403_FORBIDDEN)
        return super().update(request, *args, **kwargs)


class CourseTopicListCreateView(APIView):
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get(self, request, course_id):
        course = get_object_or_404(Course, pk=course_id)
        topics = CourseTopic.objects.filter(course=course)
        serializer = CourseTopicSerializer(topics, many=True)
        return Response(serializer.data)

    def post(self, request, course_id):
        course = get_object_or_404(Course, pk=course_id)
        if request.user != course.created_by:
            return Response({"detail": "You do not have permission to add topics to this course."}, status=status.HTTP_403_FORBIDDEN)

        serializer = CourseTopicSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        topic = serializer.save(course=course)
        return Response(CourseTopicSerializer(topic).data, status=status.HTTP_201_CREATED)


class CourseTopicDetailView(APIView):
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get(self, request, course_id, pk):
        topic = get_object_or_404(CourseTopic, course_id=course_id, pk=pk)
        serializer = CourseTopicSerializer(topic)
        return Response(serializer.data)

    def put(self, request, course_id, pk):
        topic = get_object_or_404(CourseTopic, course_id=course_id, pk=pk)
        if request.user != topic.course.created_by:
            return Response({"detail": "You do not have permission to update this topic."}, status=status.HTTP_403_FORBIDDEN)

        serializer = CourseTopicSerializer(topic, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, course_id, pk):
        topic = get_object_or_404(CourseTopic, course_id=course_id, pk=pk)
        if request.user != topic.course.created_by:
            return Response({"detail": "You do not have permission to delete this topic."}, status=status.HTTP_403_FORBIDDEN)

        topic.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class CourseVideoListCreateView(APIView):
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get(self, request, topic_id):
        topic = get_object_or_404(CourseTopic, pk=topic_id)
        videos = CourseVideo.objects.filter(topic=topic)
        serializer = CourseVideoSerializer(videos, many=True)
        return Response(serializer.data)

    def post(self, request, topic_id):
        topic = get_object_or_404(CourseTopic, pk=topic_id)
        if request.user != topic.course.created_by:
            return Response({"detail": "You do not have permission to add videos to this topic."}, status=status.HTTP_403_FORBIDDEN)

        serializer = CourseVideoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        video = serializer.save(topic=topic)
        return Response(CourseVideoSerializer(video).data, status=status.HTTP_201_CREATED)


class CourseVideoDetailView(APIView):
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get(self, request, topic_id, pk):
        video = get_object_or_404(CourseVideo, topic_id=topic_id, pk=pk)
        serializer = CourseVideoSerializer(video)
        return Response(serializer.data)

    def put(self, request, topic_id, pk):
        video = get_object_or_404(CourseVideo, topic_id=topic_id, pk=pk)
        if request.user != video.topic.course.created_by:
            return Response({"detail": "You do not have permission to update this video."}, status=status.HTTP_403_FORBIDDEN)

        serializer = CourseVideoSerializer(video, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, topic_id, pk):
        video = get_object_or_404(CourseVideo, topic_id=topic_id, pk=pk)
        if request.user != video.topic.course.created_by:
            return Response({"detail": "You do not have permission to delete this video."}, status=status.HTTP_403_FORBIDDEN)

        video.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

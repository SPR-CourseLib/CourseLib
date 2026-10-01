from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APITestCase

from backend.models import Course, Comment


class CourseCommentApiTests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(username='learner', password='test-password')
        self.course = Course.objects.create(
            title='Django basics',
            short_description='Intro course',
            description='Course description',
            created_by=self.user,
        )
        self.url = reverse('course-comments', kwargs={'course_id': self.course.pk})

    def test_comments_can_be_listed_without_authentication(self):
        Comment.objects.create(course=self.course, author=self.user, text='Useful course')

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data[0]['text'], 'Useful course')
        self.assertEqual(response.data[0]['author'], self.user.username)

    def test_anonymous_user_cannot_create_comment(self):
        response = self.client.post(self.url, {'text': 'A comment'}, format='json')

        self.assertEqual(response.status_code, 401)

    def test_cors_preflight_allows_vite_origin_with_credentials(self):
        response = self.client.options(
            self.url,
            HTTP_ORIGIN='http://localhost:5173',
            HTTP_ACCESS_CONTROL_REQUEST_METHOD='POST',
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Access-Control-Allow-Origin'], 'http://localhost:5173')
        self.assertEqual(response['Access-Control-Allow-Credentials'], 'true')

    def test_authenticated_user_can_create_comment(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.post(self.url, {'text': 'A comment'}, format='json')

        self.assertEqual(response.status_code, 201)
        comment = Comment.objects.get(pk=response.data['id'])
        self.assertEqual(comment.course, self.course)
        self.assertEqual(comment.author, self.user)


class CourseCreationPermissionTests(APITestCase):
    def setUp(self):
        self.user_model = get_user_model()
        self.url = reverse('course-list')
        self.payload = {
            'title': 'Django basics',
            'short_description': 'Intro course',
            'description': 'Course description',
        }

    def test_regular_user_cannot_create_course(self):
        user = self.user_model.objects.create_user(username='learner', password='test-password')
        self.client.force_authenticate(user=user)

        response = self.client.post(self.url, self.payload, format='json')

        self.assertEqual(response.status_code, 403)

    def test_staff_user_can_create_course(self):
        admin = self.user_model.objects.create_user(
            username='course-admin',
            password='test-password',
            is_staff=True,
        )
        self.client.force_authenticate(user=admin)

        response = self.client.post(self.url, self.payload, format='json')

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['created_by'], admin.username)

    def test_profile_returns_staff_status(self):
        admin = self.user_model.objects.create_user(
            username='profile-admin',
            password='test-password',
            is_staff=True,
        )
        self.client.force_authenticate(user=admin)

        response = self.client.get(reverse('me'))

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['is_staff'])
from django.contrib.auth import authenticate, get_user_model, login, logout
from django.urls import path
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema


User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
	class Meta:
		model = User
		fields = ("id", "username", "email")


class RegisterSerializer(serializers.ModelSerializer):
	password = serializers.CharField(write_only=True, min_length=8)

	class Meta:
		model = User
		fields = ("username", "email", "password")

	def create(self, validated_data):
		return User.objects.create_user(**validated_data)


class LoginSerializer(serializers.Serializer):
	username = serializers.CharField()
	password = serializers.CharField(write_only=True)


class MessageSerializer(serializers.Serializer):
	detail = serializers.CharField()


class RegisterView(APIView):
	permission_classes = (AllowAny,)

	@extend_schema(request=RegisterSerializer, responses={201: UserSerializer})
	def post(self, request):
		serializer = RegisterSerializer(data=request.data)
		serializer.is_valid(raise_exception=True)
		user = serializer.save()
		login(request, user)
		return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


class LoginView(APIView):
	permission_classes = (AllowAny,)

	@extend_schema(request=LoginSerializer, responses=UserSerializer)
	def post(self, request):
		username = request.data.get("username")
		password = request.data.get("password")
		if not username or not password:
			return Response(
				{"detail": "Username and password are required."},
				status=status.HTTP_400_BAD_REQUEST,
			)
		user = authenticate(request, username=username, password=password)
		if user is None:
			return Response(
				{"detail": "Invalid username or password."},
				status=status.HTTP_401_UNAUTHORIZED,
			)
		login(request, user)
		return Response(UserSerializer(user).data)


class LogoutView(APIView):
	permission_classes = (IsAuthenticated,)

	@extend_schema(request=None, responses=MessageSerializer)
	def post(self, request):
		logout(request)
		return Response({"detail": "Logged out successfully."})


class MeView(APIView):
	permission_classes = (IsAuthenticated,)

	@extend_schema(responses=UserSerializer)
	def get(self, request):
		return Response(UserSerializer(request.user).data)


urlpatterns = [
	path("register/", RegisterView.as_view(), name="register"),
	path("login/", LoginView.as_view(), name="login"),
	path("logout/", LogoutView.as_view(), name="logout"),
	path("me/", MeView.as_view(), name="me"),
]

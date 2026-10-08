from django.shortcuts import get_object_or_404
from django.conf import settings
from django.db import IntegrityError, transaction
from rest_framework import generics, serializers, status, viewsets
from rest_framework.exceptions import APIException, ValidationError
from rest_framework.permissions import IsAdminUser, IsAuthenticatedOrReadOnly, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from eth_account import Account
from eth_account.messages import encode_defunct
import logging
import re
from web3 import Web3
from web3.exceptions import TransactionNotFound

from backend.models import Comment, Course, CourseTopic, CourseVideo

from .models import Enrollment

logger = logging.getLogger(__name__)


class BlockchainUnavailable(APIException):
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    default_detail = "Blockchain enrollment is not configured."
    default_code = "blockchain_unavailable"


def _enrollment_message(course_id, tx_hash, chain_id):
    return (
        f"CourseLib enrollment\nCourse: {course_id}\n"
        f"Transaction: {tx_hash.lower()}\nChain ID: {chain_id}"
    )


def _blockchain_client():
    if not settings.BLOCKCHAIN_RPC_URL or not settings.BLOCKCHAIN_CONTRACT_ADDRESS:
        raise BlockchainUnavailable()

    try:
        contract_address = Web3.to_checksum_address(settings.BLOCKCHAIN_CONTRACT_ADDRESS)
    except ValueError as exc:
        raise BlockchainUnavailable("Blockchain contract address is invalid.") from exc

    web3 = Web3(Web3.HTTPProvider(settings.BLOCKCHAIN_RPC_URL, request_kwargs={"timeout": 8}))
    try:
        if not web3.is_connected() or web3.eth.chain_id != settings.BLOCKCHAIN_CHAIN_ID:
            raise BlockchainUnavailable("Blockchain RPC is unavailable or connected to the wrong chain.")
    except APIException:
        raise
    except Exception as exc:
        logger.exception("Unable to connect to the configured blockchain RPC")
        raise BlockchainUnavailable("Blockchain RPC is unavailable.") from exc

    return web3, contract_address

class CourseEnrollView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, course_id):
        course = get_object_or_404(Course, pk=course_id)
        enrollment = Enrollment.objects.filter(course=course, student=request.user).first()
        return Response({
            "enrolled": enrollment is not None,
            "tx_hash": enrollment.tx_hash if enrollment else None,
            "wallet_address": enrollment.wallet_address if enrollment else None,
        })

    def post(self, request, course_id):
        course = get_object_or_404(Course, pk=course_id)
        if not course.is_published:
            raise ValidationError("This course is not open for enrollment.")

        tx_hash = request.data.get("tx_hash", "")
        wallet_address = request.data.get("wallet_address", "")
        signature = request.data.get("signature", "")
        if not isinstance(tx_hash, str) or not re.fullmatch(r"0x[0-9a-fA-F]{64}", tx_hash):
            raise ValidationError({"tx_hash": "Provide a valid transaction hash."})
        if not isinstance(signature, str) or not signature:
            raise ValidationError({"signature": "A wallet signature is required."})
        try:
            wallet_address = Web3.to_checksum_address(wallet_address)
        except (TypeError, ValueError):
            raise ValidationError({"wallet_address": "Provide a valid wallet address."})

        if Enrollment.objects.filter(course=course, student=request.user).exists():
            raise ValidationError("You are already enrolled in this course.")

        try:
            web3, contract_address = _blockchain_client()
            tx = web3.eth.get_transaction(tx_hash)
            receipt = web3.eth.get_transaction_receipt(tx_hash)
        except TransactionNotFound:
            return Response({"detail": "Transaction is not mined yet."}, status=status.HTTP_409_CONFLICT)
        except APIException:
            raise
        except Exception as exc:
            logger.exception("Unable to retrieve the enrollment transaction")
            raise ValidationError("Could not retrieve the transaction from the configured chain.") from exc

        if receipt.status != 1:
            raise ValidationError("The blockchain transaction failed.")
        if tx.get("chainId") != settings.BLOCKCHAIN_CHAIN_ID:
            raise ValidationError("The transaction is from the wrong blockchain.")
        # MetaMask can submit a call through a wrapper contract. In that case,
        # tx.to/input/value describe the wrapper call, while the CourseMarketplace
        # logs still prove what happened in the inner call. For direct calls,
        # keep checking the exact enrollment calldata as an additional guard.
        tx_to = tx.get("to")
        if tx_to is not None and Web3.to_checksum_address(tx_to) == contract_address:
            expected_input = bytes(Web3.keccak(text="enroll(uint256)")[:4]) + course.pk.to_bytes(32, "big")
            if bytes(tx.get("input", b"")) != expected_input:
                raise ValidationError("The transaction does not enroll in this course.")

        enrolled_event = bytes(Web3.keccak(text="CourseEnrolled(uint256,address)"))
        purchased_event = bytes(Web3.keccak(text="CoursePurchased(uint256,address,uint256)"))
        matching_logs = [
            log for log in receipt.logs
            if Web3.to_checksum_address(log["address"]) == contract_address
            and len(log["topics"]) == 3
            and bytes(log["topics"][0]) == enrolled_event
            and int.from_bytes(bytes(log["topics"][1]), "big") == course.pk
        ]
        purchase_logs = [
            log for log in receipt.logs
            if Web3.to_checksum_address(log["address"]) == contract_address
            and len(log["topics"]) == 3
            and bytes(log["topics"][0]) == purchased_event
            and int.from_bytes(bytes(log["topics"][1]), "big") == course.pk
        ]
        if not matching_logs or not purchase_logs:
            raise ValidationError(
                "The transaction does not contain matching course enrollment and payment events."
            )

        event_wallets = {
            Web3.to_checksum_address("0x" + bytes(log["topics"][2])[-20:].hex())
            for log in matching_logs
        }
        purchased_wallets = {
            Web3.to_checksum_address("0x" + bytes(log["topics"][2])[-20:].hex())
            for log in purchase_logs
        }
        if wallet_address not in event_wallets or wallet_address not in purchased_wallets:
            raise ValidationError("The contract events and connected wallet must match.")

        message = _enrollment_message(course.pk, tx_hash, settings.BLOCKCHAIN_CHAIN_ID)
        try:
            signer = Account.recover_message(
                encode_defunct(text=message),
                signature=Web3.to_bytes(hexstr=signature),
            )
        except Exception as exc:
            raise ValidationError({"signature": "The wallet signature is invalid."}) from exc
        if Web3.to_checksum_address(signer) != wallet_address:
            raise ValidationError({"signature": "The signature must come from the transaction wallet."})

        contract = web3.eth.contract(
            address=contract_address,
            abi=[
                {
                    "inputs": [],
                    "name": "ENROLLMENT_PRICE",
                    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
                    "stateMutability": "view",
                    "type": "function",
                },
                {
                    "inputs": [
                        {"internalType": "uint256", "name": "", "type": "uint256"},
                        {"internalType": "address", "name": "", "type": "address"},
                    ],
                    "name": "isEnrolled",
                    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
                    "stateMutability": "view",
                    "type": "function",
                },
            ],
        )
        try:
            enrollment_price = contract.functions.ENROLLMENT_PRICE().call(
                block_identifier=receipt.blockNumber
            )
        except Exception as exc:
            logger.exception("Unable to read the enrollment price from the contract")
            raise BlockchainUnavailable("Could not verify the contract enrollment price.") from exc

        if not any(
            Web3.to_checksum_address("0x" + bytes(log["topics"][2])[-20:].hex()) == wallet_address
            and int.from_bytes(bytes(log["data"]), "big") == enrollment_price
            for log in purchase_logs
        ):
            raise ValidationError("The contract did not record the exact enrollment payment.")
        if not contract.functions.isEnrolled(course.pk, wallet_address).call(
            block_identifier=receipt.blockNumber
        ):
            raise ValidationError("The contract does not record this wallet as enrolled.")

        try:
            with transaction.atomic():
                enrollment = Enrollment.objects.create(
                    course=course,
                    student=request.user,
                    wallet_address=wallet_address.lower(),
                    tx_hash=tx_hash.lower(),
                )
        except IntegrityError as exc:
            raise ValidationError("This wallet or transaction is already linked to an enrollment.") from exc

        return Response({
            "detail": "Successfully enrolled!",
            "enrolled": True,
            "tx_hash": enrollment.tx_hash,
            "wallet_address": enrollment.wallet_address,
        }, status=status.HTTP_201_CREATED)

class CommentSerializer(serializers.ModelSerializer):
    author = serializers.ReadOnlyField(source='author.username')

    class Meta:
        model = Comment
        fields = ['id', 'author', 'text', 'created_at']
        read_only_fields = ['id', 'author', 'created_at']


class CourseCommentListCreateView(generics.ListCreateAPIView):
    serializer_class = CommentSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        return Comment.objects.filter(course_id=self.kwargs['course_id'])

    def perform_create(self, serializer):
        course = get_object_or_404(Course, pk=self.kwargs['course_id'])
        serializer.save(course=course, author=self.request.user)


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
    cover_image = serializers.ImageField(read_only=True)

    class Meta:
        model = Course
        fields = [
            'id',
            'title',
            'short_description',
            'level',
            'price',
            'cover_image',
            'created_by',
            'is_published',
            'created_at',
        ]
        read_only_fields = ['id', 'created_by', 'created_at']


class EnrolledCourseSerializer(serializers.ModelSerializer):
    category = serializers.CharField(source='category.name', read_only=True, allow_null=True)
    cover_image = serializers.ImageField(read_only=True)
    created_by = serializers.ReadOnlyField(source='created_by.username')

    class Meta:
        model = Course
        fields = [
            'id',
            'title',
            'short_description',
            'level',
            'price',
            'category',
            'cover_image',
            'created_by',
            'is_published',
            'created_at',
        ]


class MyCourseEnrollmentSerializer(serializers.ModelSerializer):
    course = EnrolledCourseSerializer(read_only=True)

    class Meta:
        model = Enrollment
        fields = ['course', 'wallet_address', 'tx_hash', 'created_at']


class MyCoursesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        enrollments = Enrollment.objects.filter(student=request.user).select_related(
            'course', 'course__category', 'course__created_by'
        ).order_by('-created_at')
        serializer = MyCourseEnrollmentSerializer(
            enrollments, many=True, context={'request': request}
        )
        return Response(serializer.data)


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
            'cover_image',
            'created_by',
            'is_published',
            'topics',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']

    def validate_cover_image(self, image):
        max_size = 5 * 1024 * 1024
        if image and image.size > max_size:
            raise serializers.ValidationError("Обкладинка має бути не більшою за 5 МБ.")
        return image

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

    def get_permissions(self):
        if self.action in ('create', 'destroy'):
            return [IsAdminUser()]
        return super().get_permissions()

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

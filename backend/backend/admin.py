from django.contrib import admin

from backend.models import Category, Comment, Course, CourseTopic, CourseVideo


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ('title', 'category', 'created_by', 'is_published', 'created_at')
    list_filter = ('category', 'level', 'is_published')
    search_fields = ('title', 'short_description', 'created_by__username')


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name',)
    search_fields = ('name',)


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ('course', 'author', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('text', 'course__title', 'author__username')
    readonly_fields = ('created_at',)


@admin.register(CourseTopic)
class CourseTopicAdmin(admin.ModelAdmin):
    list_display = ('title', 'course', 'order')
    list_filter = ('course',)
    search_fields = ('title', 'course__title')


@admin.register(CourseVideo)
class CourseVideoAdmin(admin.ModelAdmin):
    list_display = ('title', 'topic', 'order')
    list_filter = ('topic__course',)
    search_fields = ('title', 'topic__title', 'topic__course__title')
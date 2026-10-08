from django.db import migrations, models


def _columns(schema_editor, model):
    with schema_editor.connection.cursor() as cursor:
        return {
            column.name
            for column in schema_editor.connection.introspection.get_table_description(
                cursor, model._meta.db_table
            )
        }


def _rename_comment_column(apps, schema_editor, source, destination):
    comment = apps.get_model("backend", "Comment")
    columns = _columns(schema_editor, comment)
    has_source = source in columns
    has_destination = destination in columns

    if has_source and has_destination:
        raise RuntimeError(
            f"Both Comment.{source} and Comment.{destination} exist; "
            "resolve this schema conflict before migrating."
        )
    if has_source:
        quote = schema_editor.quote_name
        schema_editor.execute(
            f"ALTER TABLE {quote(comment._meta.db_table)} "
            f"RENAME COLUMN {quote(source)} TO {quote(destination)}"
        )
    elif not has_destination:
        raise RuntimeError(
            f"Neither Comment.{source} nor Comment.{destination} exists in the database."
        )


def rename_comment_content_to_text(apps, schema_editor):
    _rename_comment_column(apps, schema_editor, "content", "text")


def rename_comment_text_to_content(apps, schema_editor):
    _rename_comment_column(apps, schema_editor, "text", "content")


def ensure_enrollment_table(apps, schema_editor):
    enrollment = apps.get_model("backend", "Enrollment")
    with schema_editor.connection.cursor() as cursor:
        tables = {
            table.name
            for table in schema_editor.connection.introspection.get_table_list(cursor)
        }
    if enrollment._meta.db_table not in tables:
        schema_editor.create_model(enrollment)


def add_course_cover_image_if_missing(apps, schema_editor):
    course = apps.get_model("backend", "Course")
    if "cover_image" not in _columns(schema_editor, course):
        field = models.ImageField(blank=True, null=True, upload_to="course_covers/")
        field.set_attributes_from_name("cover_image")
        schema_editor.add_field(course, field)


def remove_course_cover_image(apps, schema_editor):
    course = apps.get_model("backend", "Course")
    if "cover_image" in _columns(schema_editor, course):
        field = course._meta.get_field("cover_image")
        schema_editor.remove_field(course, field)


def add_wallet_address_if_missing(apps, schema_editor):
    enrollment = apps.get_model("backend", "Enrollment")
    if "wallet_address" not in _columns(schema_editor, enrollment):
        field = models.CharField(blank=True, default="", max_length=42)
        field.set_attributes_from_name("wallet_address")
        schema_editor.add_field(enrollment, field)


def remove_wallet_address(apps, schema_editor):
    enrollment = apps.get_model("backend", "Enrollment")
    if "wallet_address" in _columns(schema_editor, enrollment):
        field = enrollment._meta.get_field("wallet_address")
        schema_editor.remove_field(enrollment, field)


def add_wallet_unique_constraint_if_missing(apps, schema_editor):
    enrollment = apps.get_model("backend", "Enrollment")
    constraint_name = "unique_course_wallet_enrollment"
    with schema_editor.connection.cursor() as cursor:
        existing = schema_editor.connection.introspection.get_constraints(
            cursor, enrollment._meta.db_table
        )
    if constraint_name not in existing:
        constraint = models.UniqueConstraint(
            condition=~models.Q(wallet_address=""),
            fields=("course", "wallet_address"),
            name=constraint_name,
        )
        schema_editor.add_constraint(enrollment, constraint)


def remove_wallet_unique_constraint(apps, schema_editor):
    enrollment = apps.get_model("backend", "Enrollment")
    constraint_name = "unique_course_wallet_enrollment"
    with schema_editor.connection.cursor() as cursor:
        existing = schema_editor.connection.introspection.get_constraints(
            cursor, enrollment._meta.db_table
        )
    if constraint_name in existing:
        constraint = models.UniqueConstraint(
            condition=~models.Q(wallet_address=""),
            fields=("course", "wallet_address"),
            name=constraint_name,
        )
        schema_editor.remove_constraint(enrollment, constraint)


class Migration(migrations.Migration):
    dependencies = [
        ("backend", "0003_alter_category_options_alter_comment_options_and_more"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunPython(
                    rename_comment_content_to_text,
                    reverse_code=rename_comment_text_to_content,
                ),
            ],
            state_operations=[
                migrations.RenameField(
                    model_name="comment",
                    old_name="content",
                    new_name="text",
                ),
            ],
        ),
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunPython(
                    ensure_enrollment_table,
                    reverse_code=migrations.RunPython.noop,
                ),
            ],
            state_operations=[],
        ),
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunPython(
                    add_course_cover_image_if_missing,
                    reverse_code=remove_course_cover_image,
                ),
            ],
            state_operations=[
                migrations.AddField(
                    model_name="course",
                    name="cover_image",
                    field=models.ImageField(blank=True, null=True, upload_to="course_covers/"),
                ),
            ],
        ),
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunPython(
                    add_wallet_address_if_missing,
                    reverse_code=remove_wallet_address,
                ),
            ],
            state_operations=[
                migrations.AddField(
                    model_name="enrollment",
                    name="wallet_address",
                    field=models.CharField(blank=True, default="", max_length=42),
                ),
            ],
        ),
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunPython(
                    add_wallet_unique_constraint_if_missing,
                    reverse_code=remove_wallet_unique_constraint,
                ),
            ],
            state_operations=[
                migrations.AddConstraint(
                    model_name="enrollment",
                    constraint=models.UniqueConstraint(
                        condition=~models.Q(wallet_address=""),
                        fields=("course", "wallet_address"),
                        name="unique_course_wallet_enrollment",
                    ),
                ),
            ],
        ),
    ]

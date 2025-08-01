from marshmallow import Schema, fields, INCLUDE

class SummarizationSchema(Schema):
    summary = fields.Str(required=True)
    key_points = fields.List(fields.Str, required=True)
    tags = fields.List(fields.Str, required=True)

class ArticleSchema(Schema):
    class Meta:
        unknown = INCLUDE
        
    id = fields.Str(dump_only=True, attribute='_id')
    title = fields.Str(required=True)
    author = fields.Str(allow_none=True, missing="No Author")
    published_date = fields.DateTime()
    url = fields.Url(required=True)
    img = fields.Url(allow_none=True, missing="None")
    summary = fields.Nested(SummarizationSchema)
    tags = fields.List(fields.Str, missing=list)
    created_at = fields.DateTime()

# Simplified schema for demo
article_schema = ArticleSchema()
from langchain_core.tools import BaseTool
from pydantic import BaseModel

class ToolInputSchema(BaseModel):
    # Define input fields in subclasses
    pass

class ToolOutputSchema(BaseModel):
    # Define output fields in subclasses
    pass

class CustomBaseTool(BaseTool):
    name: str
    description: str
    args_schema = ToolInputSchema
    output_schema = ToolOutputSchema

    def _run(self, *args, **kwargs):
        raise NotImplementedError("Tool logic must be implemented in subclasses.")

    async def _arun(self, *args, **kwargs):
        raise NotImplementedError("Async tool logic must be implemented in subclasses.") 
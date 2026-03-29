from pydantic import BaseModel


class ModuleMetadata(BaseModel):
    id: str
    name: str
    category: str
    description: str
